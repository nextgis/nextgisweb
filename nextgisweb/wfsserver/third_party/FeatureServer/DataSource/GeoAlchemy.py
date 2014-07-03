from FeatureServer.DataSource import DataSource
from vectorformats.Feature import Feature
from vectorformats.Formats import WKT
from sqlalchemy import create_engine, func
from sqlalchemy.sql import expression, visitors, operators
from sqlalchemy.orm import sessionmaker

import copy
import datetime

try:
    import decimal
except:
    pass
    
class GeoAlchemy (DataSource):
    """GeoAlchemy datasource. Setting up the table is beyond the scope of
       FeatureServer. However, GeoAlchemy supports table creation with
       geometry data types and can be used in a separate creation script."""

    query_action_types = ['eq', 'ne', 'lt', 'gt', 'ilike', 'like', 'gte', 'lte']

    query_operators = {
        'eq': operators.eq,
        'ne': operators.ne,
        'lt': operators.lt,
        'gt': operators.gt,
        'lte': operators.le,
        'gte': operators.ge
    }

    def __init__(self, name, srid=4326, srid_out=4326, fid="gid", geometry="the_geom",
            order="", attribute_cols='*', writable=True, encoding="utf-8",
            geom_cls=None, geom_rel=None, join_condition=None, sql_echo=False,
            session=None, **args):
        DataSource.__init__(self, name, **args)
        self.dburi          = args["dburi"]
        self.sql_echo       = sql_echo
        self.session        = session
        self.model          = args["model"]
        self.cls            = args["cls"]
        self.fid_col        = fid
        self.geom_col       = geometry
        self.geom_rel       = geom_rel
        self.geom_cls       = geom_cls
        self.join_condition = join_condition
        self.order          = order
        self.srid           = srid
        self.srid_out       = srid_out
        self.writable       = writable
        self.encoding       = encoding
        self.attribute_cols = attribute_cols

        if not self.session:
            self.engine = create_engine(self.dburi, echo=self.sql_echo)
            self.session = sessionmaker(bind=self.engine)()

    def feature_predicate(self, key, operator_name, value):
        if operator_name == 'like':
            return key.like('%'+value+'%')
        elif operator_name == 'ilike':
            return key.ilike('%'+value+'%')
        else:
            return self.query_operators[operator_name](key,value)

    def bbox2wkt(self, bbox):
        return "POLYGON((%s %s, %s %s, %s %s, %s %s, %s %s))" % (bbox[1],
        bbox[0],bbox[1],bbox[2],bbox[3],bbox[2],bbox[3],bbox[0],bbox[1],bbox[0])

    def begin (self):
        pass

    def commit (self):
        if self.writable:
            self.session.commit()

    def rollback (self):
        if self.writable:
            self.session.rollback()

    def insert (self, action):
        model = __import__(self.model, fromlist=['*'])
        cls = getattr(model, self.cls)
        feature = action.feature
        obj =  cls()
        for prop in feature.properties.keys():
            setattr(obj, prop, feature.properties[prop])
        if self.geom_rel and self.geom_cls:
            geom_cls = getattr(model, self.geom_cls)
            geom_obj = geom_cls()
            setattr(geom_obj, self.geom_col, WKT.to_wkt(feature.geometry))
            try:
                getattr(obj, self.geom_rel).append(geom_obj)
            except:
                # Handle specific exception
                setattr(obj, self.geom_rel, geom_obj)
            self.session.add(geom_obj)
        elif feature.geometry:
            setattr(obj, self.geom_col, WKT.to_wkt(feature.geometry))
        else:
            pass
        self.session.add(obj)
        return self.select(action)
        

    def update (self, action):
        model = __import__(self.model, fromlist=['*'])
        cls = getattr(model, self.cls)
        feature = action.feature
        obj = self.session.query(cls).get(int(action.id))
        for prop in feature.properties.keys():
            setattr(obj, prop, feature.properties[prop])
        if self.geom_rel and self.geom_cls:
            geom_obj = getattr(obj, self.geom_rel)
            setattr(geom_obj, self.geom_col, WKT.to_wkt(feature.geometry))
            self.session.add(geom_obj)
        elif feature.geometry:
            setattr(obj, self.geom_col, WKT.to_wkt(feature.geometry))
        else:
            pass
        self.session.add(obj)
        return self.select(action)
        
    def delete (self, action):
        model = __import__(self.model, fromlist=['*'])
        cls = getattr(model, self.cls)
        obj = self.session.query(cls).get(action.id)
        if self.geom_rel and self.geom_col:
            geom_obj = getattr(obj, self.geom_rel)
            if isinstance(geom_obj, (tuple, list, dict, set)):
                #TODO Should all related objects be purged
                self.session.delete(geom_obj[-1])
            else:
                self.session.delete(geom_obj)
        self.session.delete(obj)
        return []

    def select (self, action):
        model = __import__(self.model, fromlist=['*'])
        cls = getattr(model, self.cls)
        geom_cls = None
        if self.geom_cls:
            geom_cls = getattr(model, self.geom_cls)
        if action.id is not None:
            result = [self.session.query(cls).get(action.id)]
        else:
            if self.geom_rel and self.geom_cls:
                main_table = cls.__tablename__
                geom_table = geom_cls.__tablename__
                join_condition = self.join_condition or "%s.%s_id=%s.id" % (
			main_table, geom_table, geom_table)
                query = self.session.query(cls, geom_cls).filter(join_condition)
            else:
                query = self.session.query(cls)
            if action.attributes:
                query = query.filter(
                    expression.and_(
                        *[self.feature_predicate(getattr(cls, v['column']), v['type'], v['value'])
                          for k, v in action.attributes.iteritems()]
                    )
                )
            if action.bbox:
                if self.geom_rel and self.geom_cls:
                    geom_element = getattr(geom_cls, self.geom_col)
                else:
                    geom_element = getattr(cls, self.geom_col)
                query = query.filter(geom_element.intersects(
                    self.session.scalar(func.GeomFromText(
                        self.bbox2wkt(action.bbox), self.srid)
                    )
                ))
            if self.order:
                query = query.order_by(getattr(cls, self.order))
            if action.maxfeatures:
                query.limit(action.maxfeatures)
            else:   
                query.limit(1000)
            if action.startfeature:
                query.offset(action.startfeature)
            
            result = query.all()

        features = []
        for row_tuple in result:
            props = {}
            id = None
            geom = None
            if not isinstance(row_tuple, (tuple, list, dict, set)):
                row_tuple = (row_tuple,)
            for  row in row_tuple:
                if isinstance(row, cls):
                    cols = cls.__table__.c.keys()
                    for col in cols:
                        if col == self.fid_col:
                            id = getattr(row, col)
                        elif col == self.geom_col:
                            geom = WKT.from_wkt(self.session.scalar(getattr(row, col).wkt))
                        else:
                            if self.attribute_cols == '*' or col in self.attribute_cols:
                                props[col] = getattr(row, col)
                elif isinstance(row, geom_cls) and geom_cls:
                    cols = geom_cls.__table__.c.keys()
                    for col in cols:
                        if col == self.fid_col:
                            pass
                        elif col == self.geom_col:
                            geom = WKT.from_wkt(self.session.scalar(getattr(row, col).wkt))
                        else:
                            if self.attribute_cols == '*' or col in self.attribute_cols:
                                props[col] = getattr(row, col)
                else:
                    continue

            for key, value in props.items():
                if isinstance(value, str): 
                    props[key] = unicode(value, self.encoding)
                elif isinstance(value, datetime.datetime) or isinstance(value, datetime.date):
                    # stringify datetimes 
                    props[key] = str(value)
                    
                try:
                    if isinstance(value, decimal.Decimal):
                        props[key] = unicode(str(value), self.encoding)
                except:
                    pass
                    
            if (geom):
                features.append( Feature( id=id, geometry=geom, geometry_attr=self.geom_col, srs=self.srid_out, props=props ) ) 
        return features

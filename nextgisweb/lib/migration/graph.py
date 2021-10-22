from io import StringIO

import networkx as nx

from .operation import (
    InstallOperation, UninstallOperation,
    ForwardOperation, RewindOperation)
from .migration import MigrationKey


class MigrationGraph(object):

    def __init__(self, registry, install_dependencies={}):
        self._install_dependecies = install_dependencies
        self._nodes = _nodes = dict()
        self._ancestors = ancestors = dict()
        self._descendants = descendants = dict()
        self._components = components = set()
        self._dependencies = dependencies = dict()

        for comp, migs in registry._by_component.items():
            components.add(comp)
            for key, mig in migs.items():
                _nodes[key] = mig

                for pkey in mig.parents:
                    ancestors.setdefault(key, set()).add(pkey)
                    descendants.setdefault(pkey, set()).add(key)

                for a, b in mig.dependencies:
                    mka = MigrationKey(a.component, a.revision)
                    mkb = MigrationKey(b.component, b.revision)
                    dependencies.setdefault(mka, set()).add(mkb)

        self._tails = tails = set()
        self._heads = heads = set()

        for key, mig in _nodes.items():
            if key not in ancestors:
                tails.add(key)
            if key not in descendants:
                heads.add(key)

    def ancestors(self, mkeys, recursive=False):
        if not isinstance(mkeys, (set, tuple, list)) or isinstance(mkeys, MigrationKey):
            mkeys = (mkeys, )

        result = set()
        for mkey in mkeys:
            for a in self._ancestors.get(mkey, ()):
                result.add(a)
        if recursive and len(result) > 0:
            result.update(self.ancestors(result, recursive=True))

        return result

    def descendants(self, mkeys, recursive=False):
        if not isinstance(mkeys, (set, tuple, list)) or isinstance(mkeys, MigrationKey):
            mkeys = (mkeys, )

        result = set()
        for mkey in mkeys:
            for a in self._descendants.get(mkey, ()):
                result.add(a)
        if recursive and len(result) > 0:
            result.update(self.descendants(result, recursive=True))

        return result

    def select(self, selector, from_nodes=None, component=None):
        def _fcomponent(iterable):
            if component is None:
                return set(iterable)
            else:
                return set(filter(lambda m: m.component == component, iterable))

        if selector == 'all':
            assert from_nodes is None
            return _fcomponent(self._nodes)
        elif selector == 'head':
            assert from_nodes is None
            return _fcomponent(self._heads)
        elif selector == 'tail':
            assert from_nodes is None
            return _fcomponent(self._tails)
        else:
            raise ValueError("Invalid selector")

    def operations(self, forward=True, rewind=True, install=True, uninstall=True):
        result = list()
        for key, mig in self._nodes.items():
            ucond = {key: False}
            dcond = {key: True}

            for pkey in mig.parents:
                ucond[pkey] = True

            for dkey in self.descendants(key, False):
                dcond[dkey] = False

            for dep in self._dependencies.get(mig.key, ()):
                dkey = MigrationKey(dep.component, dep.revision)
                ucond[dkey] = dcond[dkey] = True
                for skey in self.descendants(dkey, True):
                    ucond[skey] = False
                    dcond[skey] = False

            if forward and mig.has_forward:
                result.append(ForwardOperation(ucond, {key: True}, mig))
            if rewind and mig.has_rewind:
                result.append(RewindOperation(dcond, {key: False}, mig))

        for component in self._components:
            if install:
                icond = {key: False for key in (
                    self.select('head', component=component) |  # NOQA: W504
                    self.select('tail', component=component))}
                for depcomp in self._install_dependecies.get(component, ()):
                    icond.update({key: True for key in self.select('head', component=depcomp)})
                result.append(InstallOperation(icond, {
                    k: True for k in self.select('all', component=component)
                }, component))
            if uninstall:
                ucond = {key: True for key in self.select('head', component=component)}
                for k, v in self._install_dependecies.items():
                    if component in v:
                        ucond.update({key: False for key in self.select('tail', component=k)})
                result.append(UninstallOperation(ucond, {
                    k: False for k in self.select('all', component=component)
                }, component))
        return result


class OperationGraph(object):

    def __init__(self, opertaions):
        self.operations = opertaions

    def resolve(self, fstate, tstate):
        dg = nx.DiGraph()
        for op in self.operations:
            dg.add_node(op, transform=True)
            for c in op.condition.items():
                dg.add_edge(c, op)
            for v in op.action.items():
                dg.add_edge(op, v, weight=1 + op.oprank * 1e6)

        fstate = frozenset(fstate.items())
        tstate = frozenset(tstate.items())

        for s in fstate | tstate:
            if s not in dg.nodes:
                dg.add_node(s)

        def resolve(src, tgt, rectgt, reclimit):
            if reclimit <= 0:
                raise ValueError("Max recursion depth is reached!")
            result = set()
            for t in tgt:
                # print("Searching path from [{}] to [{}]".format(
                #     ' '.join(map(str, src)), ' '.join(map(str, t))))
                mask = set()
                while True:
                    try:
                        path = nx.multi_source_dijkstra(dg, src - mask, t)[1]
                    except nx.NetworkXNoPath:
                        return None
                    except ValueError:
                        if src == mask:
                            return None
                        raise

                    resolved, unres = set(), set()
                    wrongway = False
                    for pnode in path[1:]:
                        if dg.nodes[pnode].get('transform', False):
                            for n in dg.predecessors(pnode):
                                if n not in src:
                                    unres.add(n)
                            for n in dg.successors(pnode):
                                if n in src:
                                    wrongway = True
                        if pnode not in src:
                            resolved.add(pnode)

                    if wrongway:
                        mask.add(path[0])
                        continue

                    if len(unres) > 0:
                        if not unres.isdisjoint(rectgt):
                            mask.add(path[0])
                            continue
                        else:
                            sub = resolve(
                                src | resolved, unres, rectgt | frozenset((t, )),
                                reclimit - 1)
                            if sub is None:
                                mask.add(path[0])
                                continue
                            resolved.update(sub)

                    result.update(resolved)
                    break

            return result

        res = resolve(fstate, tstate, frozenset(), 100)
        if res is None:
            return None

        ops = frozenset([op for op in res if dg.nodes[op].get('transform')])
        subg = dg.subgraph(res)
        assert nx.is_directed_acyclic_graph(subg)

        tsort = list(nx.topological_sort(subg))
        sops = sorted(ops, key=tsort.index)
        return sops

    def to_dot(self, fstate, tstate):
        skeys = dict()
        okeys = dict()
        for op in self.operations:
            okeys[op] = len(okeys) + 1
            for k in op.condition:
                skeys.setdefault(k, len(skeys) + 1)
            for k in op.action:
                skeys.setdefault(k, len(skeys) + 1)

        for s in fstate:
            skeys.setdefault(k, len(skeys) + 1)
        for s in tstate:
            skeys.setdefault(k, len(skeys) + 1)

        out = StringIO()

        def w(l):
            out.write(l)
            out.write('\n')

        def sc(a, b):
            if a is None:
                return "?"
            return '●' if a == b else '○'

        w('digraph {')
        for s in skeys:
            w(
                '  S{} ['.format(skeys[s]) + 'shape=plaintext label=<' + ''
                '<table border="0" cellborder="1" cellpadding="4" cellspacing="0"><tr>' + ''
                '<td port="F" bgcolor="{1}">{0}</td>'.format(sc(fstate.get(s), False), 'gray' if tstate.get(s) is False else 'white') + ''  # NOQA: E501
                '<td>{}</td>'.format(s) + ''
                '<td port="T" bgcolor="{1}">{0}</td>'.format(sc(fstate.get(s), True), 'gray' if tstate.get(s) is True else 'white') + ''  # NOQA: E501
                '</tr></table>>]'
            )

        for o in self.operations:
            tmp = list()
            fwd = not getattr(o, 'gvinv', False)
            gvcolor = getattr(o, 'gvcolor', 'green' if fwd else 'red')
            tmp.append('O{0} [shape=rect label="{1}" style=filled fillcolor={2}]'.format(okeys[o], o, gvcolor))  # NOQA: E501

            for ck, cv in o.action.items():
                link = ('O{}'.format(okeys[o]), 'S{}:{}'.format(skeys[ck], 'T' if cv else 'F'))
                lopts = list()
                if not fwd:
                    link = (link[1], link[0])
                    lopts.append('dir=back')
                tmp.append('{} -> {} [{}]'.format(link[0], link[1], ' '.join(lopts)))

            for ck, cv in o.condition.items():
                link = ('S{0}:{1}'.format(skeys[ck], 'T' if cv else 'F'), 'O{}'.format(okeys[o]))
                lopts = list()
                if not fwd:
                    link = (link[1], link[0])
                    lopts.append('dir=back')
                if ck in o.action:
                    lopts.append('constraint=false')
                tmp.append('{} -> {} [{}]'.format(link[0], link[1], ' '.join(lopts)))

            w('  ' + '; '.join(tmp))

        w('}')

        return out.getvalue()


def resolve(operations, fstate, tstate):
    r = OperationGraph(operations)
    # print(r.to_dot(fstate, tstate))
    return r.resolve(fstate, tstate)

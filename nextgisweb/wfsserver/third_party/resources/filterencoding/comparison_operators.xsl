<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
	xmlns:regexp="http://exslt.org/regular-expressions" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	
	<xsl:param name="datasource" />
	<xsl:param name="operationType" />
	<xsl:param name="hstore" />
	<xsl:param name="hstoreAttribute" />
	
	<xsl:template match="/">
		<Statements>
			<xsl:apply-templates>
				<xsl:with-param name="datasource" select="$datasource" />
				<xsl:with-param name="hstore" select="$hstore" />
				<xsl:with-param name="hstoreAttribute" select="$hstoreAttribute" />
			</xsl:apply-templates>
		</Statements>
	</xsl:template>
	
	<xsl:template match="*[local-name(.)='PropertyIsEqualTo']">
		<xsl:param name="datasource" />
		<xsl:param name="hstore" />
		<xsl:param name="hstoreAttribute" />
		<xsl:choose>
			<xsl:when test="($datasource='PostGIS' and $hstore='false') or $datasource='SpatialLite'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
					<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" = '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
					<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" = '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
					<Statement>"<xsl:value-of select="$hstoreAttribute"/>" @&gt; hstore('<xsl:value-of select="//*[local-name() = 'ValueReference']" />','<xsl:value-of select="//*[local-name() = 'Literal']" />')</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
					<Statement>"<xsl:value-of select="$hstoreAttribute"/>" @&gt; hstore('<xsl:value-of select="//*[local-name() = 'PropertyName']" />','<xsl:value-of select="//*[local-name() = 'Literal']" />')</Statement>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="*[local-name(.)='PropertyIsNotEqualTo']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" != '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" != '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' != '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' != '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="*[local-name(.)='PropertyIsLessThan']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" &lt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" &lt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
					<xsl:choose>
						<xsl:when test="//*[local-name() = 'PropertyName'] = 'ele'">
							<Statement>cast(regexp_replace(hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />', '[^0-9\.]', '', 'g') as real) &lt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:when>
						<xsl:otherwise>
							<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' &lt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
					<xsl:choose>
						<xsl:when test="//*[local-name() = 'PropertyName'] = 'ele'">
							<Statement>cast(regexp_replace(hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />', '[^0-9\.]', '', 'g') as real) &lt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:when>
						<xsl:otherwise>
							<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' &lt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="*[local-name(.)='PropertyIsGreaterThan']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" &gt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" &gt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
					<xsl:choose>
						<xsl:when test="//*[local-name() = 'PropertyName'] = 'ele'">
							<Statement>cast(regexp_replace(hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />', '[^0-9\.]', '', 'g') as real) &gt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:when>
						<xsl:otherwise>
							<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' &gt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
					<xsl:choose>
						<xsl:when test="//*[local-name() = 'PropertyName'] = 'ele'">
							<Statement>cast(regexp_replace(hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />', '[^0-9\.]', '', 'g') as real) &gt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:when>
						<xsl:otherwise>
							<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' &gt; '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="*[local-name(.)='PropertyIsLessThanOrEqualTo']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" &lt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" &lt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
					<xsl:choose>
						<xsl:when test="//*[local-name() = 'PropertyName'] = 'ele'">
							<Statement>cast(regexp_replace(hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />', '[^0-9\.]', '', 'g') as real) &lt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:when>
						<xsl:otherwise>
							<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' &lt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
					<xsl:choose>
						<xsl:when test="//*[local-name() = 'PropertyName'] = 'ele'">
							<Statement>cast(regexp_replace(hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />', '[^0-9\.]', '', 'g') as real) &lt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:when>
						<xsl:otherwise>
							<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' &lt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="*[local-name(.)='PropertyIsGreaterThanOrEqualTo']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" &gt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" &gt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
					<xsl:choose>
						<xsl:when test="//*[local-name() = 'PropertyName'] = 'ele'">
							<Statement>cast(regexp_replace(hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />', '[^0-9\.]', '', 'g') as real) &gt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:when>
						<xsl:otherwise>
							<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' &gt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
					<xsl:choose>
						<xsl:when test="//*[local-name() = 'PropertyName'] = 'ele'">
							<Statement>cast(regexp_replace(hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />', '[^0-9\.]', '', 'g') as real) &gt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:when>
						<xsl:otherwise>
							<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' &gt;= '<xsl:value-of select="//*[local-name() = 'Literal']" />'</Statement>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="*[local-name(.)='PropertyIsLike']">
		<xsl:param name="datasource" />
		<xsl:variable name="literal" select="//*[local-name() = 'Literal']"/>
		<xsl:variable name="wildcard" select="@wildCard"/>
		<xsl:variable name="singlechar" select="@singleChar"/>
		
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:variable name="like1" select="regexp:replace(string($literal), string($wildcard), 'g', '%%')"/>
				<xsl:variable name="like2" select="regexp:replace(string($like1), string($singlechar), 'g', '_')"/>
				
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" LIKE '<xsl:value-of select="$like2" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" LIKE '<xsl:value-of select="$like2" />'</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:variable name="like1" select="regexp:replace(string($literal), string($wildcard), 'g', '%%')"/>
				<xsl:variable name="like2" select="regexp:replace(string($like1), string($singlechar), 'g', '_')"/>

				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' LIKE '<xsl:value-of select="$like2" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' LIKE '<xsl:value-of select="$like2" />'</Statement>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="*[local-name(.)='PropertyIsBetween']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" BETWEEN '<xsl:value-of select="//*[local-name() = 'LowerBoundary']" />' AND '<xsl:value-of select="//*[local-name() = 'UpperBoundary']" />'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" BETWEEN '<xsl:value-of select="//*[local-name() = 'LowerBoundary']" />' AND '<xsl:value-of select="//*[local-name() = 'UpperBoundary']" />'</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' BETWEEN '<xsl:value-of select="//*[local-name() = 'LowerBoundary']" />' AND '<xsl-value-of select="//*[local-name() = 'UpperBoundary']"/>'</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' BETWEEN '<xsl:value-of select="//*[local-name() = 'LowerBoundary']" />' AND '<xsl-value-of select="//*[local-name() = 'UpperBoundary']"/>'</Statement>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>
	
	<xsl:template match="*[local-name(.)='PropertyIsNil']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" = ''</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" = ''</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' = ''</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' = ''</Statement>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="*[local-name(.)='PropertyIsNull']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' and $hstore='false'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>"<xsl:value-of select="//*[local-name() = 'ValueReference']" />" = NULL</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>"<xsl:value-of select="//*[local-name() = 'PropertyName']" />" = NULL</Statement>
				</xsl:if>
			</xsl:when>
			<xsl:when test="$datasource='PostGIS' and $hstore='true'">
				<xsl:if test="//*[local-name() = 'ValueReference']">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'ValueReference']" />' = NULL</Statement>
				</xsl:if>
				<xsl:if test="not(//*[local-name() = 'ValueReference'])">
				<Statement>hstore("<xsl:value-of select="$hstoreAttribute"/>")-&gt;'<xsl:value-of select="//*[local-name() = 'PropertyName']" />' = NULL</Statement>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

</xsl:stylesheet>
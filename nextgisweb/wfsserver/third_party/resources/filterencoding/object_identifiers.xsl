<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
	xmlns:regexp="http://exslt.org/regular-expressions" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	
	<xsl:param name="datasource" />
	<xsl:param name="operationType" />
	<xsl:param name="attributeIdName" />
	
	<xsl:template match="/">
		<Statements>
			<xsl:apply-templates>
				<xsl:with-param name="datasource" select="$datasource" />
			</xsl:apply-templates>
		</Statements>
	</xsl:template>
	
	<!-- Filter Encoding 2.0.0 -->
	<xsl:template match="*[local-name(.)='ResourceId']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' or $datasource='SpatialLite'">
				<Statement>"<xsl:value-of select="$attributeIdName" />" = '<xsl:value-of select="@rid" />'</Statement>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

	<!-- Filter Encoding 1.1.0 -->
	<xsl:template match="*[local-name(.)='FeatureId']">
		<xsl:param name="datasource" />
		<xsl:choose>
			<xsl:when test="$datasource='PostGIS' or $datasource='SpatialLite'">
				<Statement>"<xsl:value-of select="$attributeIdName" />" = '<xsl:value-of select="@fid" />'</Statement>
			</xsl:when>
		</xsl:choose>
	</xsl:template>

</xsl:stylesheet>
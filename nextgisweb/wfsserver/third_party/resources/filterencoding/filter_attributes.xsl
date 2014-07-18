<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
	xmlns:regexp="http://exslt.org/regular-expressions"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	
	<xsl:template match="/">
		<Attributes>
			<xsl:apply-templates select="//*[local-name(.) = 'PropertyName']" />, <xsl:apply-templates select="//*[local-name(.) = 'ValueReference']" />
		</Attributes>
	</xsl:template>
    
	<!-- Filter Encoding 2.0.0 -->
	<xsl:template match="*[local-name(.) = 'ValueReference']"><xsl:value-of select="." />,</xsl:template>
     
	<!-- Filter Encoding 1.1.0 -->
    <xsl:template match="//*[local-name(.) = 'PropertyName']"><xsl:value-of select="." />,</xsl:template>
    
</xsl:stylesheet>

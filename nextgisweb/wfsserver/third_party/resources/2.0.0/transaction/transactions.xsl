<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
    xmlns:regexp="http://exslt.org/regular-expressions" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    
    <xsl:param name="datasource" />
    <xsl:param name="transactionType" />
    <xsl:param name="geometryAttribute" />
    <xsl:param name="geometryData" />
    <xsl:param name="tableName" />
    <xsl:param name="tableId" />
    
    <xsl:template match="/">
        <Statements>
        <xsl:choose>
            <xsl:when test="$transactionType='insert'">
                <xsl:call-template name="Insert">
                    <xsl:with-param name="datasource" select="$datasource" />
                    <xsl:with-param name="geometryAttribute" select="$geometryAttribute" />
                    <xsl:with-param name="geometryData" select="$geometryData" />
                    <xsl:with-param name="tableName" select="$tableName" />
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="$transactionType='update'">
                <xsl:call-template name="Update">
                    <xsl:with-param name="datasource" select="$datasource" />
                    <xsl:with-param name="geometryAttribute" select="$geometryAttribute" />
                    <xsl:with-param name="geometryData" select="$geometryData" />
                    <xsl:with-param name="tableName" select="$tableName" />
                    <xsl:with-param name="tableId" select="$tableId" />
                </xsl:call-template>
            </xsl:when>
            <xsl:when test="$transactionType='delete'">
                <xsl:call-template name="Delete">
                    <xsl:with-param name="datasource" select="$datasource" />
                    <xsl:with-param name="tableName" select="$tableName" />
                    <xsl:with-param name="tableId" select="$tableId" />
                </xsl:call-template>
            </xsl:when>
        </xsl:choose>
        </Statements>
    </xsl:template>
    
    <xsl:template name="Insert">
        <xsl:param name="datasource" />
        <xsl:param name="geometryAttribute"/>
        <xsl:param name="geometryData"/>
        <xsl:param name="tableName"/>

                <Statement>
                { 
                    <xsl:for-each select="child::*">
                    <xsl:variable name="total" select="count(child::*)" />
                    <xsl:for-each select="child::*">
                        "<xsl:value-of select="local-name(.)"/>" :
                            <xsl:choose>
                                <xsl:when test="local-name(.)=$geometryAttribute">
                                    "<xsl:value-of select="string($geometryData)" />"
                                </xsl:when>
                                <xsl:otherwise>
                                    <xsl:variable name="newtext">
                                        <xsl:call-template name="string-replace-all">
                                            <xsl:with-param name="text" select="." />
                                            <xsl:with-param name="replace" select="'&quot;'" />
                                            <xsl:with-param name="by" select="'\&quot;'" />
                                        </xsl:call-template>
                                    </xsl:variable>
                                    "<xsl:value-of select="$newtext" />"
                                </xsl:otherwise>
                            </xsl:choose>
                        <xsl:if test="position() &lt; $total">,</xsl:if>
                    </xsl:for-each>
                </xsl:for-each>
                } 
            </Statement>

    </xsl:template>
    
    <xsl:template name="Update">
        <xsl:param name="datasource" />
        <xsl:param name="geometryAttribute"/>
        <xsl:param name="geometryData"/>
        <xsl:param name="tableName"/>
        <xsl:param name="tableId" />
                <Statement>
                    {
                    "<xsl:value-of select="$tableId"/>" : "<xsl:value-of select="//*[local-name()='FeatureId']/@fid" />",
                    <xsl:for-each select="child::*">
                        <xsl:variable name="total" select="count(//*[local-name()='Property'])" />
                        <xsl:for-each select="//*[local-name()='Property']/*[local-name()='Name']">
                            <xsl:choose>
                                <xsl:when test=".=$geometryAttribute and string-length($geometryData) > 0">
                                    "<xsl:value-of select="."/>" : "<xsl:value-of select="string($geometryData)" />"
                                </xsl:when>
                                <xsl:otherwise>
                                    <xsl:variable name="newtext">
                                        <xsl:call-template name="string-replace-all">
                                            <xsl:with-param name="text" select="./following-sibling::*[1]" />
                                            <xsl:with-param name="replace" select="'&quot;'" />
                                            <xsl:with-param name="by" select="'\&quot;'" />
                                        </xsl:call-template>
                                    </xsl:variable>
                                    "<xsl:value-of select="."/>" : "<xsl:value-of select="$newtext"/>"
                                </xsl:otherwise>
                            </xsl:choose>
                            <xsl:if test="position() &lt; $total">,</xsl:if>
                        </xsl:for-each>
                    </xsl:for-each>
                    }
                </Statement>
    </xsl:template>
    
    <xsl:template name="Delete">
        <xsl:param name="datasource" />
        <xsl:param name="tableName"/>
        <xsl:param name="tableId" />
        
        <xsl:variable name="total" select="count(//*[local-name()='FeatureId'])" />
        
                <Statement>
                    [
                <xsl:for-each select="//*[local-name()='FeatureId']">
                    <xsl:value-of select="./@fid" />
                    <xsl:if test="position() &lt; $total">, </xsl:if>
                </xsl:for-each>
                    ]
                </Statement>
        
    </xsl:template>

    <xsl:template name="string-replace-all">
        <xsl:param name="text" />
        <xsl:param name="replace" />
        <xsl:param name="by" />
        <xsl:choose>
            <xsl:when test="contains($text, $replace)">
                <xsl:value-of select="substring-before($text,$replace)" />
                <xsl:value-of select="$by" />
                <xsl:call-template name="string-replace-all">
                    <xsl:with-param name="text"
                                    select="substring-after($text,$replace)" />
                    <xsl:with-param name="replace" select="$replace" />
                    <xsl:with-param name="by" select="$by" />
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$text" />
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

</xsl:stylesheet>

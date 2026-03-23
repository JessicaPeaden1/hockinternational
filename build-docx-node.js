const meta = $input.first().json;
const { documentXml, relsXml, stylesXml, contentTypesXml, rootRelsXml } = meta.docxParts;

// ─── CRC32 ───────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ─── ZIP helpers ─────────────────────────────────────────────────────────────
function u16(v) { return Buffer.from([v & 0xFF, (v >> 8) & 0xFF]); }
function u32(v) { return Buffer.from([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF]); }

function buildDocx(files) {
  const entries = [];
  let offset = 0;
  for (const { name, content } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const dataBuf = Buffer.from(content, 'utf8');
    const crc = crc32(dataBuf);
    const localHeader = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(dataBuf.length), u32(dataBuf.length),
      u16(nameBuf.length), u16(0),
      nameBuf
    ]);
    entries.push({ nameBuf, dataBuf, crc, localHeader, offset });
    offset += localHeader.length + dataBuf.length;
  }
  const centralParts = entries.map(e => Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x01, 0x02]),
    u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
    u32(e.crc), u32(e.dataBuf.length), u32(e.dataBuf.length),
    u16(e.nameBuf.length), u16(0), u16(0), u16(0), u16(0),
    u32(0), u32(e.offset),
    e.nameBuf
  ]));
  const centralDir = Buffer.concat(centralParts);
  const centralDirOffset = offset;
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x05, 0x06]),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralDir.length), u32(centralDirOffset),
    u16(0)
  ]);
  return Buffer.concat([
    ...entries.map(e => Buffer.concat([e.localHeader, e.dataBuf])),
    centralDir,
    eocd
  ]);
}

// ─── Enhanced Styles XML ─────────────────────────────────────────────────────
// Provides Heading1–4, TOCHeading, SectionBanner, Normal, ListBullet, Bold,
// matching the HOCK International textbook look from the screenshots.
const enhancedStylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">

  <!-- Default document font and spacing -->
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="259" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <!-- Normal -->
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="200" w:line="276" w:lineRule="auto"/>
      <w:jc w:val="both"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>

  <!-- Heading 1 — Study Unit title (dark navy, 26pt, bold) -->
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="480" w:after="200" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:bCs/>
      <w:color w:val="1B3A5C"/>
      <w:sz w:val="52"/>
      <w:szCs w:val="52"/>
    </w:rPr>
  </w:style>

  <!-- Heading 2 — Section header e.g. "The Budgeting Mandate..." (blue, 16pt, bold) -->
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="360" w:after="120" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:bCs/>
      <w:color w:val="2574A9"/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
    </w:rPr>
  </w:style>

  <!-- Heading 3 — Sub-section (dark blue, 13pt, bold) -->
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="240" w:after="80" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:bCs/>
      <w:color w:val="1B3A5C"/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
    </w:rPr>
  </w:style>

  <!-- Heading 4 — Minor sub-heading (dark gray, 11pt, bold italic) -->
  <w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="heading 4"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="200" w:after="80"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="3"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:bCs/>
      <w:i/>
      <w:color w:val="333333"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPr>
  </w:style>

  <!-- TOC Heading — "Table of Contents" label -->
  <w:style w:type="paragraph" w:styleId="TOCHeading">
    <w:name w:val="TOC Heading"/>
    <w:basedOn w:val="Heading1"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="240" w:after="120"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="9"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="1B3A5C"/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
    </w:rPr>
  </w:style>

  <!-- SectionBanner — "Section A" / "Study Unit 1" orange-blue banners -->
  <w:style w:type="paragraph" w:styleId="SectionBanner">
    <w:name w:val="Section Banner"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="360" w:after="200" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="left"/>
      <w:shd w:val="clear" w:color="auto" w:fill="F4900C"/>
      <w:pBdr>
        <w:bottom w:val="single" w:sz="12" w:space="4" w:color="2574A9"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:bCs/>
      <w:color w:val="FFFFFF"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>

  <!-- StudyUnitBanner — Peach/cream colored study unit box -->
  <w:style w:type="paragraph" w:styleId="StudyUnitBanner">
    <w:name w:val="Study Unit Banner"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="120" w:after="240" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="left"/>
      <w:shd w:val="clear" w:color="auto" w:fill="FDE8D0"/>
      <w:pBdr>
        <w:left w:val="single" w:sz="24" w:space="8" w:color="2574A9"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:color w:val="1B3A5C"/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
    </w:rPr>
  </w:style>

  <!-- ListBullet — Bulleted list items -->
  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:numPr>
        <w:numId w:val="1"/>
      </w:numPr>
      <w:spacing w:after="80"/>
      <w:ind w:left="720" w:hanging="360"/>
    </w:pPr>
  </w:style>

  <!-- Bold character style for inline bold (e.g. key terms) -->
  <w:style w:type="character" w:styleId="BoldTerm">
    <w:name w:val="Bold Term"/>
    <w:qFormat/>
    <w:rPr>
      <w:b/>
      <w:bCs/>
    </w:rPr>
  </w:style>

  <!-- Underline character style -->
  <w:style w:type="character" w:styleId="UnderlineTerm">
    <w:name w:val="Underline Term"/>
    <w:qFormat/>
    <w:rPr>
      <w:u w:val="single"/>
    </w:rPr>
  </w:style>

  <!-- Hyperlink -->
  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr>
      <w:color w:val="2574A9"/>
      <w:u w:val="single"/>
    </w:rPr>
  </w:style>

</w:styles>`;

// ─── Numbering XML (bullet lists) ────────────────────────────────────────────
const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="\u2022"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="o"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:hint="default"/></w:rPr>
    </w:lvl>
    <w:lvl w:ilvl="2">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="\u25AA"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
</w:numbering>`;

// ─── Enhanced Content Types (adds numbering part) ────────────────────────────
const enhancedContentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

// ─── Enhanced document.xml.rels (adds numbering relationship) ────────────────
const enhancedRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
  <Relationship Id="rId2"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering"
    Target="numbering.xml"/>
</Relationships>`;

// ─── Assemble files ──────────────────────────────────────────────────────────
// Use enhanced styles/rels/content-types for heading support,
// but keep the incoming documentXml (the actual content) and rootRelsXml as-is.
const files = [
  { name: '[Content_Types].xml',              content: enhancedContentTypesXml },
  { name: '_rels/.rels',                      content: rootRelsXml             },
  { name: 'word/document.xml',                content: documentXml             },
  { name: 'word/_rels/document.xml.rels',     content: enhancedRelsXml         },
  { name: 'word/styles.xml',                  content: enhancedStylesXml       },
  { name: 'word/numbering.xml',               content: numberingXml            },
];

const docxBuffer = buildDocx(files);
const fileName = `CMA_SU${meta.studyUnitId}_Textbook.docx`;

return [{
  json: {
    mondayItemId: meta.mondayItemId,
    fileColumnId: 'file_mm0v2kwf',
    fileName
  },
  binary: {
    data: {
      data: docxBuffer.toString('base64'),
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName
    }
  }
}];

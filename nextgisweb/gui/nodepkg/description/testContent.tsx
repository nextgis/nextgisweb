import { randAccount, randBrand, randParagraph } from "@ngneat/falso";
import { range } from "lodash-es";

import { assert } from "@nextgisweb/jsrealm/error";

function createTestImage(width = 256, height = width) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    assert(ctx);

    ctx.fillStyle = "salmon";
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.save();
    ctx.fillStyle = "teal";
    ctx.font = `${height / 16}px sans`;
    ctx.translate(width / 2, height / 2);
    ctx.fillText(`${width} x ${height}`, 0, 0);
    ctx.restore();

    return canvas.toDataURL("image/png");
}

export const testContent = `
<h2>Heading H2</h2>

<p>${randParagraph()}</p>
<p>${randParagraph()}</p>
<p>${randParagraph()}</p>

<h4>Figure + paragraph + </h4>

<figure>
    <p>
        <img src="${createTestImage(256)}">
    </p>
</figure>

<h3>Heading H3</h3>

<p>
    Very long unbreakable line, where a forced line break is expected:
    ${randAccount({ accountLength: 256 })}
</p>

<p>Table with many columns, where scrolling is expected:</p>
<figure class="table">
    <table><tbody><tr>
        ${(() => {
            return range(64)
                .map((i) => `<td>${i}</td>`)
                .join("\n");
        })()}
    </tr></tbody></table>
</figure>

<h4>Lists</h4>

<ul>
    <li>${randBrand()}
        <ul>
            <li>${randBrand()}</li>
            <li>${randBrand()}</li>
            <li>${randBrand()}</li>
        </ul>
    </li>
    <li>${randBrand()}</li>
    <li>${randBrand()}</li>
</ul>

<ol>
    <li>${randBrand()}</li>
    <li>${randBrand()}
        <ol>
            <li>${randBrand()}</li>
            <li>${randBrand()}</li>
            <li>${randBrand()}</li>
        </ol>
    </li>
    <li>${randBrand()}</li>
</ol>

<h4>Big picture</h4>

<figure>
    <img src="${createTestImage(2048)}">
</figure>

<h4>32px resized to 2048px figure</h4>

<figure>
    <img src="${createTestImage(32)}" width="2048" height="2048">
</figure>


<h4>32px resized to 2048px figure with caption</h4>

<figure>
    <img src="${createTestImage(32)}" width="2048" height="2048">
    <figcaption>Figure caption</figcaption>
</figure>

<h4>64px resized to 16px inline image</h4>

<p>
    ${randParagraph()}
    <img src="${createTestImage(64)}" width="16" height="16">
</p>

<h4>32px resized to 2048px CKEditor-style figure</h4>

<figure>
    <p>
        <img src="${createTestImage(32)}" width="2048" height="2048">
    </p>
</figure>
`;

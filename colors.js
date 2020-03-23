var colorname=document.getElementById("colorname");
var colorwords=document.getElementById("colorwords");
var colorchips=document.getElementById("colorchips");

var stylesheet = document.styleSheets[0]

var colormap = {
    "olive": "#556b2f",
    "lavender": "#967bb6",
    "burgundy": "#6e0a1e",
    "yellow": "#fdfa72",
    "green": "#06a94d",
    "beige": "#e2cbb0",
    "maroon": "#800000", // "#4f0007"
    "ecru": "#fef0e3",
    "chartreuse": "#7fff00",
    "turquoise": "#43e8d8",
    "white": "#ffffff",
    "flesh": "#e9d8a1", // ["#e9d8a1", "#442d26"],
    "azure": "#2b9890",
    "puce": "#c97c9b",
    "magenta": "#953d55",
    "orange": "#ffaa00",
    "purple": "#684d77",
    "muddy": "#735a3a",
    "russet": "#84332c",
    "amber": "#e99d56",
    "blue": "#27357e",
    "black": "#000000",
    "gold": "#ffd700",
    "crimson": "#c61d18",
    "brown": "#663300",
    "rosey": "#da8c9b",
    "hazel": "#86993d",
    "mauve": "#b47477",
    "fuschia": "#ff77ff", // #dd7d98
    "sepia": "#ac8760",
    "nutria": "#af8b71", // #ccbc9c
    "cerise": "#d65c7a",
    "grey": "#b5b5b5",
    "coral": "#f09d8a"
}

// color fade
function transitionBgColor(hex) {
    // inspired by https://codepen.io/webercoder/pen/njBDr
    d3.selectAll("body")
      .transition()
      .duration(3000)
      .style("background-color", hex);
    //window.setTimeout(transitionBgColor, 3000);
}

var SELECTED = null;
function activate(paintChip) {
    let transparency = paintChip.getElementsByClassName('paintChipTransparency')[0];
    transparency.classList.add('active');
    SELECTED = paintChip;
}
function deactivate(paintChip) {
    if (paintChip) { // ignore if not yet set
        let transparency = paintChip.getElementsByClassName('paintChipTransparency')[0];
        transparency.classList.remove('active');
    }
}

// switch b/w colors
function updateColor(paintChip, fcolor, hex) {
    let color = fcolor.replace(/^[0-9]*_/, '');

    colorname.innerText = color;

    // https://stackoverflow.com/a/49680132
    fetch('chapters/' + fcolor)
      .then(response => response.text())
      .then(data => {
        colorwords.innerHTML = data.replace(/\n/g, '<br/>');
      });

    // special case to make white show up
    let shadow = (color == 'white')? '3px 3px 7px #000000' : '';
    colorwords.style.textShadow = shadow;
    colorname.style.textShadow = shadow;
    ps = document.getElementsByTagName('p')
    for (i=0; i < ps.length; i++) {
        ps[i].style.textShadow = shadow;
    };

    // highlight selected; unhighlight rest
    deactivate(SELECTED); // must deactive before resetting SELECTED
    activate(paintChip);

    // reverse selection mode
    // via https://stackoverflow.com/a/3428066
    // use insertRule() for standards, addRule() for IE (doesn't have ::selection)
    let TYPES = ['-moz-selection', 'selection', '-webkit-selection']
    if ("insertRule" in stylesheet) {
        for (i=0; i < TYPES.length; i++) {
            if (stylesheet.cssRules[i].cssText.startsWith('.dynamicHighlight')) { // make sure rule has already been added
                stylesheet.deleteRule(i);
            }
            stylesheet.insertRule('.dynamicHighlight::' + TYPES[i] + '{ background: white; color: ' + hex + '; }', 0);
        }
    };

    // fade
    transitionBgColor(colormap[color]);
}

// create colorpad
function pad2(n) {
    return (n < 10 ? '0' : '') + n;
}
function makeClassyDiv(cls) {
    let div = document.createElement('div');
    div.classList.add(cls);
    return div;
}
function makePaintChip(color, hex) {
    let paintChip = makeClassyDiv('paintChipOuter');

    let paintChipTransparency = makeClassyDiv('paintChipTransparency');
    let paintChipBox = makeClassyDiv('paintChipInnerBox');
    let paintChipText = makeClassyDiv('paintChipInnerText');

    paintChipBox.style.backgroundColor = hex;
    paintChipBox.append(paintChipTransparency);
    paintChipText.innerText = color; // + ' (' + hex + ')';

    paintChip.append(paintChipBox);
    paintChip.append(paintChipText);

    return paintChip;
}

var colors = Object.keys(colormap)
for (i=0; i < colors.length; i++) {
    let k = colors[i];   // color title
    let v = colormap[k]; // hex
    let fcolor = pad2(i + 1) + '_' + k; // numbered from 1

    let paintChip = makePaintChip(k, v);
    paintChip.onmousedown = function(){ updateColor(paintChip, fcolor, v); };

    colorchips.append(paintChip);
}
updateColor(colorchips.firstChild, '01_olive', colormap[colors[0]])

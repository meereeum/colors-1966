const colorname=document.getElementById("colorname");
const colorwords=document.getElementById("colorwords");
const colorchips=document.getElementById("colorchips");

const stylesheet = document.styleSheets[0];

const colormap = {
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
    "flesh": ["#e9d8a1", "#442d26", "#f1c27d", "#ffdbac", "#c68642", "#8d5524", "#e0ac69", "#260701"],
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
    "fuchsia": "#ff77ff", // #dd7d98
    "sepia": "#ac8760",
    "nutria": "#af8b71", // #ccbc9c
    "cerise": "#d65c7a",
    "grey": "#b5b5b5",
    "coral": "#f09d8a"
};


// CSS utils
const PREFIXES = ['',          // IE 10+, Fx29+
                  '-moz-',     // Fx 5+
                  '-webkit-']; // Safari 4+
                  // '-o-'];   // Opera 12+ <-- insertRule doesn't like this

const ruleAdder = ("insertRule" in stylesheet)?
    function(rule) { stylesheet.insertRule(rule); } : // standards
    function(rule) { stylesheet.addRule(rule); };     // dumb ol' IE

var timer = null;
var nticks = 1000;
var currPct = 0;
var keyframesRule = null;

function findKeyframesRule(rule) {
    let cssRules = stylesheet.cssRules
    let keyframesRuleArr = [window.CSSRule.KEYFRAMES_RULE,
                            window.CSSRule.WEBKIT_KEYFRAMES_RULE]

    for (i = 0; i < cssRules.length; i++) {
        if (keyframesRuleArr.includes(cssRules[i].type) &&
            cssRules[i].name == rule) {
            return stylesheet.cssRules[i];
      }
    };
}

function getClosestKeyframe(pct, keyframesRule) {
    let cssRules = keyframesRule.cssRules
    let dist = 101
    let closestFrame = null

    for (i = 0; i < cssRules.length; i++) {
        let frame = cssRules[i]
        let rawPcts = frame.keyText.split(',') // e.g. 0%, 100%

        for (j = 0; j < rawPcts.length; j++) {
            let keyPct = Number.parseFloat(rawPcts[j]);
            let keyDist = Math.abs(pct - keyPct);

            if (keyDist < dist) {
                dist = keyDist;
                closestFrame = frame;
            };
        };
    };
    return closestFrame;
}

function getBookendingKeyframes(pct, keyframesRule) {
    let cssRules = keyframesRule.cssRules

    let beforeDist = 101
    let beforeFrame = null
    let afterDist = -101
    let afterFrame = null

    for (i = 0; i < cssRules.length; i++) {
        let frame = cssRules[i]
        let rawPcts = frame.keyText.split(',') // e.g. 0%, 100%

        for (j = 0; j < rawPcts.length; j++) {
            let keyPct = Number.parseFloat(rawPcts[j]);
            let keyDist = pct - keyPct;

            if ((keyDist >= 0) && (keyDist < beforeDist)) {
                beforeDist = keyDist;
                beforeFrame = frame;
            };
            if ((keyDist <= 0) && (keyDist > afterDist)) {
                afterDist = keyDist;
                afterFrame = frame;
            };
        };
    };
    let pctBetween = beforeDist / (beforeDist + Math.abs(afterDist));

    return {'beforeFrame': beforeFrame,
            'afterFrame': afterFrame,
            'pctBetween': pctBetween};
}

function toArr(strRGB) {
    let arr = strRGB.replace(/[^0-9,]/g,'') // comma-sep numbers only
                    .split(',')
                    .map(Number.parseFloat);
    return arr;
}

function computeTransitionalBgColor(pct, keyframesRule) {
    let obj = getBookendingKeyframes(pct, keyframesRule);

    let beforeColor = obj['beforeFrame'].style.backgroundColor;
    let afterColor = obj['afterFrame'].style.backgroundColor;
    let fraction = obj['pctBetween'];

    if (isNaN(fraction)) { // exactly at transition
        return beforeColor;
    };

    let beforeRGB = toArr(beforeColor);
    let afterRGB = toArr(afterColor);

    // console.log(keyframesRule);
    // console.log(pct);
    // console.log('before', beforeRGB);
    // console.log('after', afterRGB);
    // console.log(fraction);

    // linearly interpolate rgb
    let arrRGB = [];
    for (i = 0; i < beforeRGB.length; i++) {
        arrRGB[i] = (beforeRGB[i] + fraction * (afterRGB[i] - beforeRGB[i]))
                        .toFixed(0);
    };
    // console.log(arrRGB);
    return 'rgb(' + arrRGB.join(', ') + ')';
}


// where necessary, create looping hex animation corresponding to `color`
function chooseRandom(list) {
    return list[Math.floor((Math.random() * list.length))];
}
function shuffle(unshuffled) {
    let shuffled = (unshuffled
      .map((a) => ({sort: Math.random(), value: a}))
      .sort((a, b) => a.sort - b.sort)
      .map((a) => a.value));

    return shuffled;
}
function createKeyFrames(color, hexes) {
    let animname = color + 'Loop'

    let n = hexes.length
    let chunksize = 100 / n

    let keyframeBody = ''
    for (i=0; i < n; i++) {
        let pct = (i == 0)? '0%, 100%' : // wrap around
                            `${i * chunksize}%`
        keyframeBody += `
            ${pct} {
                background-color: ${hexes[i]};
            }`
    }
    keyframeBody += '}'

    let animRule = `.${color}Loopy {`
    let animRuleBody = `${animname} ${2.5 * n}s infinite linear;`

    for (i=0; i < PREFIXES.length; i++) {
        let keyframeStart = `@${PREFIXES[i]}keyframes ${animname} {`
        ruleAdder(keyframeStart + keyframeBody);

        animRule += `
            ${PREFIXES[i]}animation: ${animRuleBody}
        `
    };
    animRule += '}'
    ruleAdder(animRule);
};

for (let [k, v] of Object.entries(colormap)) {
    if (Array.isArray(v)) {
        let vShuff = shuffle(v); // randomize animation order
        colormap[k] = vShuff;
        createKeyFrames(k, vShuff);
    };
};


// color fade
function transitionBgColor(hex) {
    // inspired by https://codepen.io/webercoder/pen/njBDr
    // return d3.selectAll("body")
    //          .transition()
    //          .duration(3000)
    //          .style("background-color", hex)
    document.body.style.backgroundColor = hex;
}


// swatch selection crosshatch
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
function updateColor(paintChip, fcolor) {
    let color = fcolor.replace(/^[0-9]*_/, '');
    let hex = colormap[color]

    // load text
    colorname.innerText = color;

    // https://stackoverflow.com/a/49680132
    fetch('chapters/' + fcolor)
      .then(response => response.text())
      .then(data => {
        colorwords.innerHTML = data.replace(/\n/g, '<br/>');
      });

    // highlight selected chip; unhighlight rest
    deactivate(SELECTED); // must deactive before resetting SELECTED
    activate(paintChip);

    // special case to make white show up
    let shadow = (color == 'white')? '3px 3px 7px #000000' : '';
    colorwords.style.textShadow = shadow;
    colorname.style.textShadow = shadow;
    ps = document.getElementsByTagName('p')
    for (i=0; i < ps.length; i++) {
        ps[i].style.textShadow = shadow;
    };

    // reverse selection mode
    // via https://stackoverflow.com/a/3428066
    let bghighlight = (color == 'white')? 'black' : 'white';
    let fghighlight = (color == 'white')? 'white' : (Array.isArray(hex))? chooseRandom(hex) : hex;

    // use insertRule() for standards, addRule() for IE (doesn't have ::selection)
    if ("insertRule" in stylesheet) {
        for (i=0; i < PREFIXES.length; i++) {
            if (stylesheet.cssRules[i].cssText.startsWith('.dynamicHighlight')) { // make sure rule has already been added
                stylesheet.deleteRule(i);
            }
            stylesheet.insertRule(`.dynamicHighlight::${PREFIXES[i]}selection {
                                       background: ${bghighlight};
                                       color: ${fghighlight};
                                   }`, 0);
        }
    };

    // fade
    if (Array.isArray(hex)) { // multiple colors
        // TODO: cross-browserify
        document.body.ontransitionend = () => { // wait for transition to end before beginning loop

            currPct = 0; // reset anew;
            keyframesRule = findKeyframesRule(color + 'Loop'); // set to relevant keyframes
            let secsPerLoop = 2.5 * keyframesRule.cssRules.length;

            document.body.onanimationstart = () => {
                // increment current percentage thru keyrule
                timer = window.setInterval(() => {
                    currPct = (currPct < nticks)? currPct + 1 : 0;
                    // console.log('i: ', currPct);
                }, secsPerLoop * 1000 / nticks); // milliseconds per loop tick = (s / loop) * (1000 ms / s) * (1 cycle / 100 ticks)
            };
            document.body.classList.add(color + 'Loopy');
            document.body.style.animationPlayState = 'running';
            document.body.ontransitionend = () => {};
            console.log('running');
        };
        transitionBgColor(hex[0]);

        // d3
        // transitionBgColor(hex[0])
        //     .on("end", function() { // wait for transition to end before beginning loop
        //             document.body.classList.add(color + 'Loopy');
        //             document.body.style.animationPlayState = 'running';
        //     });
    }
    else {
        // document.body.ontransitionend = () => {}; // remove hook
        window.clearInterval(timer);
        document.body.className = document.body.className
            .replace(/ *[a-z]*Loopy */, '');      // remove, no matter the name of the `color`Loop

        if (document.body.style.animationPlayState == 'running') {

            // window.clearInterval(timer);
            //
            // window.setTimeout(() => {
            //     document.body.style.webkitAnimationPlayState = 
            //     document.body.style.mozAnimationPlayState = 
            //     document.body.style.oAnimationPlayState = 
            //     document.body.style.animationPlayState = 'paused';
            // }, 10);
            // document.body.style.webkitAnimationPlayState = 
            // document.body.style.mozAnimationPlayState = 
            // document.body.style.oAnimationPlayState = 
            // document.body.style.animationPlayState = 'paused';

            // document.body.style.animationPlayState = 'paused';

            // document.body.className = document.body.className
            //     .replace(/ *[a-z]*Loopy */, '');      // remove, no matter the name of the `color`Loop

            // // window.setInterval(() => {}, 0); // stop timing
            // window.clearInterval(timer);

            // document.body.className = document.body.className
            //     .replace(/ *[a-z]*Loopy */, '');      // remove, no matter the name of the `color`Loop

            // console.log('preset: ', document.body.style.backgroundColor)
            // console.log('computed: ', window.getComputedStyle(document.body)['background-color']);

            // let frame = getClosestKeyframe(currPct / nticks * 100, keyframesRule)
            // console.log('myComputedClosest: ', frame.style.backgroundColor);
            // // document.body.style.backgroundColor = frame.style.backgroundColor;

            let rgb = computeTransitionalBgColor(currPct / nticks * 100, keyframesRule)
            console.log('myComputedTransitional: ', rgb);

            let rgbComputed = window.getComputedStyle(document.body)['background-color'];
            console.log('ComputedTransitional: ', rgbComputed);

            document.body.ontransitionend = () => {
                document.body.classList.remove('quicktransition'); // re-enable
                // document.body.classList.add('regtransition'); // re-enable
                document.body.ontransitionend = () => {};
                console.log('3: ', document.body.style);

                document.body.style.webkitAnimationPlayState = 
                    document.body.style.mozAnimationPlayState = 
                    document.body.style.oAnimationPlayState = 
                    document.body.style.animationPlayState = 'paused';

                transitionBgColor(hex);
                console.log('4: ', document.body.style);
            };

            document.body.style.backgroundColor = rgb;
            document.body.classList.add('quicktransition'); // temporarily disable
            // transitionBgColor(hex);

            // document.body.classList.add('notransition'); // temporarily disable
            // document.body.style.backgroundColor = rgb;
            // document.body.classList.remove('notransition'); // re-enable
            // console.log(window.getComputedStyle(document.body));
            // transitionBgColor(hex);
            // console.log(window.getComputedStyle(document.body));

            // document.body.classList.remove('regtransition');
            // document.body.classList.add('quicktransition'); // temporarily disable
            // console.log('1: ', document.body.style);
            // document.body.style.backgroundColor = rgb;
            // document.body.ontransitionend = () => {};
            // document.body.classList.add('regtransition'); // re-enable
            // console.log(window.getComputedStyle(document.body));
            // transitionBgColor(hex);
            // console.log(window.getComputedStyle(document.body));
            // console.log('2: ', document.body.style);
            // transitionBgColor(hex);
            // document.body.style.backgroundColor = window.getComputedStyle(document.body)['background-color'];
            // document.body.classList.remove('notransition'); // re-enable
            // document.body.classList.remove('quicktransition'); // re-enable

            // console.log('now set: ', document.body.style.backgroundColor);

            // // console.log(document.body.style.backgroundColor);
            // // console.log('--> ', document.body.style.backgroundColor);
            // // console.log(document.body.style);
        }
    else {
        // document.body.ontransitionend = () => {}; // remove hook
        transitionBgColor(hex);
    };
    // transitionBgColor(hex);
    };
}


// create color swatches
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

    if (Array.isArray(hex)) { // multiple colors
        paintChipBox.style.backgroundColor = hex[0]; // chooseRandom(hex);
        paintChipBox.classList.add(color + 'Loopy');
    }
    else {
        paintChipBox.style.backgroundColor = hex;
    }
    paintChipBox.append(paintChipTransparency);
    paintChipText.innerText = color; // + ' (' + hex + ')';

    paintChip.append(paintChipBox);
    paintChip.append(paintChipText);

    return paintChip;
}


// let there be colors
const colors = Object.keys(colormap)
for (i=0; i < colors.length; i++) {
    let k = colors[i];   // color title
    let v = colormap[k]; // hex
    let fcolor = pad2(i + 1) + '_' + k; // numbered from 1

    let paintChip = makePaintChip(k, v);
    paintChip.onmousedown = function(){ updateColor(paintChip, fcolor); };

    colorchips.append(paintChip);
}
updateColor(colorchips.firstChild, '01_olive')

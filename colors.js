var colorname=document.getElementById("colorname");
var colorwords=document.getElementById("colorwords");
var colorchips=document.getElementById("colorchips");
// ^ older iOS won't let these be consts :/

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
const PREFIXES = ['',         // IE 10+, Fx29+
                  '-moz-',    // Fx 5+ <-- insertRule in chrome doesn't like this
                  '-webkit-', // Safari 4+
                  '-o-'];     // Opera 12+ <-- insertRule doesn't like this

const ruleAdder = ("insertRule" in stylesheet)?
    (...args) => { stylesheet.insertRule(...args); } : // standards
    (...args) => { stylesheet.addRule(...args); };     // dumb ol' IE

function tryAddRule(...args) {
    try {
        return ruleAdder(...args);
    }
    catch(err) {
        console.log('skipping rule: ', args);
        // console.log(err);
    }
}

// for some reason, ffox will still render -webkit-text-stroke
// (necessary to make chrome fonts match ffox)
const userAgent = navigator.userAgent.toLowerCase()
// const usesWebkit = userAgent.includes('webkit');
// if (usesWebkit) {
if (userAgent.includes('webkit')) {
    let h1s = document.getElementsByTagName('h1');
    thickness = userAgent.includes('apple')? 'thicker' : 'thickest';
    Array.from(h1s)
         .forEach(h1 => h1.classList.add(thickness));

    let as = document.getElementsByTagName('a');
    Array.from(as)
         .filter(a => a.classList.contains('dynamicHighlight')) // text links only
         .forEach(a => a.classList.add('jankyDoubleLine'));
};
if (userAgent.includes('phone')) {
    let hoverLines = Array.from(stylesheet.cssRules)
                          .filter(r => (!!r.selectorText) ? // some rules have no selector text
                                       r.selectorText.startsWith('.paintChipTransparency:hover') :
                                       null)[0]
    // hover lines sometimes crowd out active lines
    // (b/c phones have no real hover) -- so just get rid of these
    hoverLines.style.background = hoverLines.style.backgroundImage = '';
};


function titlecase(s) {
    return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
}

// inspired by https://davidwalsh.name/css-animation-callback
function whichEvent(eventtype, eventtime) {
    let el = document.createElement('fakeelement');
    let transitions = {
      'transition': (eventtype + eventtime).toLowerCase(),                        // e.g. transitionend
      'MozTransition': (eventtype + eventtime).toLowerCase(),                     // e.g. transitionend
      'WebkitTransition': 'webkit' + titlecase(eventtype) + titlecase(eventtime), // e.g. webkitTransitionEnd
      'OTransition': 'o' + (eventtype + eventtime).toLowerCase()                  // e.g. otransitionend
    };
    for (let t in transitions) {
        if (el.style[t] !== undefined) {
            return transitions[t];
        };
    };
}
const transitionStart = whichEvent('transition', 'start')
const transitionEnd = whichEvent('transition', 'end')
const animationStart = whichEvent('animation', 'start')
const animationEnd = whichEvent('animation', 'end')

function onEvent(elem, eventname, fn) {
    elem.addEventListener(eventname, fn, {'once': true})
}

function setAnimationPlayState(elem, setting) { // cross-platform
    elem.style.animationPlayState =
        elem.style.webkitAnimationPlayState =
        elem.style.mozAnimationPlayState =
        elem.style.oAnimationPlayState = setting;
}


var timer = null;
var nticks = 1000;
var currPct = 0;
var currKeyframesRule = null;

function findKeyframesRule(rule) {
    let keyframesRuleArr = [window.CSSRule.KEYFRAMES_RULE,
                            window.CSSRule.WEBKIT_KEYFRAMES_RULE]

    return Array.from(stylesheet.cssRules)
                .filter(cssRule => (keyframesRuleArr.includes(cssRule.type)
                                    && cssRule.name == rule))
                [0]; // b/c filter return array
}

function getClosestKeyframe(pct, keyframesRule) {
    let dist = 101
    let closestFrame = null

    for (let frame of keyframesRule.cssRules) {

        let rawPcts = frame.keyText.split(',') // e.g. 0%, 100%

        for (let rawPct of rawPcts) {

            let keyDist = Math.abs(pct - Number.parseFloat(rawPct));

            if (keyDist < dist) {
                dist = keyDist;
                closestFrame = frame;
            };
        };
    };
    return closestFrame;
}

function getBookendingKeyframes(pct, keyframesRule) {

    let beforeDist = 101
    let beforeFrame = null
    let afterDist = -101
    let afterFrame = null

    for (let frame of keyframesRule.cssRules) {

        let rawPcts = frame.keyText.split(',') // e.g. 0%, 100%

        for (let rawPct of rawPcts) {

            let keyDist = pct - Number.parseFloat(rawPct);

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

function toRGB(arrRGB) {
    return `rgb( ${ arrRGB.map(v => v.toFixed(0))
                          .join(', ')} )`;
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

    // linearly interpolate rgb
    let arrRGB = [];
    for (i = 0; i < beforeRGB.length; i++) {
        arrRGB[i] = beforeRGB[i] + fraction * (afterRGB[i] - beforeRGB[i]);
    };
    return toRGB(arrRGB);
}

function avgRGB(strRGBs) {
    let colorArrs = strRGBs.map(toArr)   // "rgb()" -> [r,g,b]

    let sum = colorArrs[0].map(() => 0); // zeros_like([r,g,b])
    let avg = []

    for (i=0; i < sum.length; i++) { // r,g,b
        for (let arr of colorArrs) {
            sum[i] += arr[i]**2;
        };
        avg[i] = Math.sqrt(sum[i] / colorArrs.length);
    };
    return toRGB(avg);
}

function computeAvgBgColor(keyframesRule) {
    let frameRGBs = Array.from(keyframesRule.cssRules)
                         .map(r => r.style.backgroundColor);
    return avgRGB(frameRGBs);
}


// where necessary, create looping hex animation corresponding to `color`
function chooseRandom(arr) {
    return arr[Math.floor((Math.random() * arr.length))];
}
function shuffle(unshuffled) {
    return unshuffled
            .map(a => ({ sort: Math.random(), value: a }))
            .sort((a, b) => a.sort - b.sort)
            .map(a => a.value);
}
function createKeyFrames(color, hexes) {
    let animname = color + 'Loop';

    let n = hexes.length;
    let chunksize = 100 / n;

    let keyframeBody = '';
    for (i=0; i < n; i++) {
        let pct = (i == 0)? '0%, 100%' : // wrap around
                            `${i * chunksize}%`;
        keyframeBody += `
            ${pct} {
                background-color: ${hexes[i]};
            }`
    }
    keyframeBody += '}';

    let animRule = `.${color}Loopy {`;
    let animRuleBody = `${animname} ${2.5 * n}s infinite linear;`;

    for (i=0; i < PREFIXES.length; i++) {
        let keyframeStart = `@${PREFIXES[i]}keyframes ${animname} {`;
        tryAddRule(keyframeStart + keyframeBody);

        animRule += `
            ${PREFIXES[i]}animation: ${animRuleBody}
        `;
    };
    animRule += '}';
    tryAddRule(animRule);
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
function getActiveColor() {
    let colorName = SELECTED.getElementsByClassName('paintChipInnerText')
                        [0].innerText;
    return colorName;
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
    ps = document.getElementsByTagName('p');
    Array.from(ps)
         .forEach(p => p.style.textShadow = shadow);

    // reverse selection mode
    // via https://stackoverflow.com/a/3428066
    let bghighlight = (color == 'white')? 'black' : 'white';
    let fghighlight = (color == 'white')? 'white' : (Array.isArray(hex))? chooseRandom(hex) : hex;

    // use insertRule() for standards, addRule() for IE (doesn't have ::selection)
    if ("insertRule" in stylesheet) {
        for (i=0; i < PREFIXES.length; i++) {
            if (stylesheet.cssRules[i].cssText.startsWith('.dynamicHighlight')) { // make sure rule has already been added
                stylesheet.deleteRule(i);
            };
            tryAddRule(`.dynamicHighlight::${PREFIXES[i]}selection {
                            background: ${bghighlight};
                            color: ${fghighlight};
                        }`, 0);
        };
    };

    // fade
    if (Array.isArray(hex)) { // multiple colors

        onEvent(document.body, transitionEnd, () => { // wait for transition to end before beginning loop
            if (color == getActiveColor()) {
                currPct = 0; // reset anew
                currKeyframesRule = findKeyframesRule(color + 'Loop'); // set to relevant keyframes
                let secsPerLoop = 2.5 * currKeyframesRule.cssRules.length;

                onEvent(document.body, animationStart, () => {
                    // increment current percentage thru keyrule
                    timer = window.setInterval(() => {
                        currPct = (currPct < nticks)? currPct + 1 : 0;
                    }, secsPerLoop * 1000 / nticks); // milliseconds per loop tick = (s / loop) * (1000 ms / s) * (1 cycle / 100 ticks)
                });

                document.body.classList.add(color + 'Loopy');
                setAnimationPlayState(document.body, 'running');
            };
            // else, transition interrupted before loop kicked in (so skip it!)
        });

        transitionBgColor(hex[0]);

        // d3
        // transitionBgColor(hex[0])
        //     .on("end", function() { // wait for transition to end before beginning loop
        //             document.body.classList.add(color + 'Loopy');
        //             document.body.style.animationPlayState = 'running';
        //     });
    }
    else {
        // window.clearInterval(timer);
        document.body.className = document.body.className
            .replace(/ *[a-z]*Loopy */, ''); // remove, no matter the name of the `color`Loop

        if (document.body.style.animationPlayState == 'running') {

            window.clearInterval(timer);
            setAnimationPlayState(document.body, 'paused'); // (if only on transitionEnd, sometimes not fired)

            // let frame = getClosestKeyframe(currPct / nticks * 100, currKeyframesRule)
            // console.log('myComputedClosest: ', frame.style.backgroundColor);

            let rgb = computeTransitionalBgColor(currPct / nticks * 100, currKeyframesRule);
            // console.log('myComputedTransitional: ', rgb);
            
            // let rgbAvg = computeAvgBgColor(currKeyframesRule);
            // console.log('myComputedAvg: ', rgb);

            // for some reason, need this for `transitionend` to get called on time:
            let rgbComputed = window.getComputedStyle(document.body)['background-color'];
            // console.log('ComputedTransitional: ', rgbComputed);

            onEvent(document.body, transitionEnd, () => {
                document.body.classList.remove('quickTransition'); // restore default
                // document.body.style.transitionDuration = '3s';
                // onEvent(document.body, transitionEnd, () => {});

                if (color == getActiveColor()) {
                    transitionBgColor(hex);
                }; // else, interrupted mid-transition (so, move on)
            })

            document.body.classList.add('quickTransition'); // temporarily override transition
            document.body.style.backgroundColor = rgb;
            console.log(rgb);

            // setAnimationPlayState(document.body, 'paused'); // (if only ontransitionend, sometimes not fired)

            // document.body.style.transitionDuration = '0s';
            // document.body.style.backgroundColor = rgb;
            // console.log(rgb);
            // document.body.style.transitionDuration = '3s';
            // transitionBgColor(hex);
        }
        else {
            transitionBgColor(hex);
        };
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
        paintChipBox.style.backgroundColor = hex[0];
        paintChipBox.classList.add(color + 'Loopy');
    }
    else {
        paintChipBox.style.backgroundColor = hex;
    }
    paintChipBox.classList.add('noSelect');
    paintChipBox.append(paintChipTransparency);
    paintChip.append(paintChipBox);

    paintChipText.innerText = color; // + ' (' + hex + ')';
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
    paintChip.onmousedown = () => updateColor(paintChip, fcolor);

    colorchips.append(paintChip);
}
updateColor(colorchips.firstChild, '01_olive');

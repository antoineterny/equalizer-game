const createBandFilter = (context, freq) => {
  const filter = context.createBiquadFilter()
  filter.type = "peaking"
  filter.frequency.value = freq
  return filter
}

const connectEqualizerFilters = (source, bandFilters, destination) => {
  // here we connect the audio source and output to the filter chain
  source.connect(bandFilters[0])
  for (let i = 1; i < bandFilters.length; i++) {
    bandFilters[i - 1].connect(bandFilters[i])
  }
  bandFilters[bandFilters.length - 1].connect(destination)
}

const getRandomInt = (max) => Math.floor(Math.random() * Math.floor(max))

const isEqualizationEqual = (eq1, eq2) => {
  if (eq1.length !== 10) {
    throw Error(`Equalization array 1 has incorrect length: ${eq1.length}`)
  }
  if (eq2.length !== 10) {
    throw Error(`Equalization array 2 has incorrect length: ${eq2.length}`)
  }
  for (let i = 0; i < 10; i++) {
    if (eq1[i] !== eq2[i]) return false
  }
  return true
}

const generateAlternative = (givenEq) => {
  const candidate = givenEq.slice()
  while (isEqualizationEqual(givenEq, candidate)) {
    candidate[getRandomInt(10)] = [-12, 0, 12][getRandomInt(3)]
    if (getRandomInt(5) === 0) {
      candidate[getRandomInt(10)] = [-12, 0, 12][getRandomInt(3)]
    }
    if (getRandomInt(6) === 0) {
      candidate[getRandomInt(10)] = [-12, 0, 12][getRandomInt(3)]
    }
    if (getRandomInt(16) === 0) {
      candidate[getRandomInt(10)] = [-12, 0, 12][getRandomInt(3)]
    }
  }
  return candidate
}

const generateAlternativeEqualizations = (givenEq) => {
  // here we generate three other equalizations a few edits distant of the given one
  let candidates = [
    generateAlternative(eqReset),
    generateAlternative(eqReset),
    generateAlternative(givenEq),
  ]
  const areAllCandidatesDifferent = () =>
    !(
      isEqualizationEqual(candidates[0], candidates[1]) ||
      isEqualizationEqual(candidates[0], candidates[2]) ||
      isEqualizationEqual(candidates[0], givenEq)
    )
  while (!areAllCandidatesDifferent()) {
    candidates = [
      generateAlternative(eqReset),
      generateAlternative(eqReset),
      generateAlternative(givenEq),
    ]
  }
  return candidates
}

const displayEqualization = (svgDocument, equalization) => {
  const calcSliderPosition = (level) => {
    // these two constants come from the SVG file
    const positionY0 = 67
    const heightBandFilter = 90
    return positionY0 - level * (heightBandFilter / 2 / 12) - 5
  }
  Array.from(svgDocument.getElementsByClassName("band-filter")).forEach((sliderKnob, index) => {
    const level = equalization[index]
    sliderKnob.setAttribute("y", calcSliderPosition(level).toString())
    // here we add the level as data attribute to the slider, so that we can later recover
    sliderKnob.setAttribute("data-level", level)
  })
}
const getEqualizationFromSvgDocument = (svgDocument) =>
  Array.from(svgDocument.getElementsByClassName("band-filter")).map((x) =>
    parseInt(x.dataset.level),
  )

const newGame = () => {
  const equalizationBase = generateAlternative(eqReset)
  const alternatives = generateAlternativeEqualizations(equalizationBase)
  alternatives.push(equalizationBase)
  alternatives.sort(() => Math.random() - 0.5) // shuffle
  return {
    currentEqualization: equalizationBase,
    quizEqualizationOptions: alternatives,
  }
}

// EVENT ADDING/REMOVING HELPERS (adapted from: https://stackoverflow.com/a/4386514/149872)
const _eventHandlers = {}

const addListener = (node, event, handler, capture = false) => {
  if (!(node in _eventHandlers)) {
    _eventHandlers[node] = {}
  }
  if (!(event in _eventHandlers[node])) {
    _eventHandlers[node][event] = []
  }
  _eventHandlers[node][event].push([handler, capture])
  node.addEventListener(event, handler, capture)
}

const removeAllListeners = (node, event) => {
  if (node in _eventHandlers) {
    if (event in _eventHandlers[node]) {
      for (let i = _eventHandlers[node][event].length; i--; ) {
        const handler = _eventHandlers[node][event][i]
        node.removeEventListener(event, handler[0], handler[1])
      }
      _eventHandlers[node][event] = []
    }
  }
}

// Main starts here
const audioContext = new (window.AudioContext || window.webkitAudioContext)()
const EQ_FREQUENCIES = [32, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
const bandFilters = EQ_FREQUENCIES.map((freq) => createBandFilter(audioContext, freq))

const source = audioContext.createMediaElementSource(equalizedAudioPlayer)
connectEqualizerFilters(source, bandFilters, audioContext.destination)

const applyEqualizationToAudio = (equalization) =>
  bandFilters.forEach((filter, i) => (filter.gain.value = equalization[i]))

const eqReset = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

let game = newGame()

// UI stuff
audioFileSelector.onchange = () => {
  const file = audioFileSelector.files[0]
  equalizedAudioPlayer.src = URL.createObjectURL(file)
  uiAudioSourceName.textContent = file.name
  audioFileSelector.classList.add("d-none")
}

const handleClickListenEQVersion = () => {
  applyEqualizationToAudio(game.currentEqualization)
  buttonListenEq.classList.add("d-none")
  buttonListenOriginal.classList.remove("d-none")
}

const handleClickListenOriginal = () => {
  applyEqualizationToAudio(eqReset)
  buttonListenEq.classList.remove("d-none")
  buttonListenOriginal.classList.add("d-none")
}

const handleClickButtonChangeAudio = () => {
  audioFileSelector.classList.remove("d-none")
}

const setUIMessage = (message) => (quizUIMessage.innerHTML = message)

const handleClickSvgDocument = (svgDocument, index) => {
  const eqClicked = getEqualizationFromSvgDocument(svgDocument)
  if (isEqualizationEqual(game.currentEqualization, eqClicked)) {
    setUIMessage('<strong class="text-success">Congrats! You did it!</strong>')
    svgObjects.forEach((obj, i) => {
      removeAllListeners(obj.getSVGDocument(), "click")
      removeClickableLook(i)
      if (i !== index) {
        obj.classList.add("d-none")
      }
    })
  } else {
    setUIMessage("<span class='text-danger'>Oops! That's not it! Try again</span>")
  }
}

// The equalizer is made to look clickable relying on CSS classes for the
// <object> element to add border and :hover,  and the cursor is made "pointer"
// with a CSS class for a transparent <rect /> put in the SVG for this specific purpose
const addClickableLook = (index) => {
  svgObjects[index].classList.add("svg-equalizer-clickable")
  svgDocument = svgObjects[index].getSVGDocument()
  svgDocument.getElementById("clickable-mask").classList.add("clickable")
}
const removeClickableLook = (index) => {
  svgObjects[index].classList.remove("svg-equalizer-clickable")
  svgDocument = svgObjects[index].getSVGDocument()
  svgDocument.getElementById("clickable-mask").classList.remove("clickable")
}

const initSvgDocument = (svgDocument, index) => {
  const equalization = game.quizEqualizationOptions[index]
  displayEqualization(svgDocument, equalization)
  addClickableLook(index)
  addListener(svgDocument, "click", () => handleClickSvgDocument(svgDocument, index))
}

const svgObjects = Array.from(document.getElementsByTagName("object"))
svgObjects.forEach((obj, i) =>
  obj.addEventListener("load", () => initSvgDocument(obj.getSVGDocument(), i)),
)

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
  equalization.forEach((level, index) => {
    const sliderKnob = svgDocument.getElementById(`band-filter-${index + 1}`)
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
audioFileSelector.onchange = function() {
  // this needs to be written with function() syntax in order to have this
  const file = this.files[0]
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

const handleClickSvgDocument = (svgDocument, index) => {
  const eqClicked = getEqualizationFromSvgDocument(svgDocument)
  console.log("you clicked position", index)
  if (isEqualizationEqual(game.currentEqualization, eqClicked)) {
    console.log("Congrats! You did it!", eqClicked)
  } else {
    console.log("Oops! That's not it! Try again")
  }
}

const initSvgDocument = (svgDocument, index) => {
  const equalization = game.quizEqualizationOptions[index]
  displayEqualization(svgDocument, equalization)
  svgDocument.addEventListener("click", function() {
    handleClickSvgDocument(this, index)
  })
}

const svgObjects = Array.from(document.getElementsByTagName("object"))
svgObjects.forEach((obj, i) =>
  obj.addEventListener("load", () => initSvgDocument(obj.getSVGDocument(), i)),
)

const video = document.getElementById("video")
const aim = document.getElementById("aim")
const cards = document.querySelectorAll(".card")
const thought = document.getElementById("thought")

let smoothX = 0
let smoothY = 0
let history = []
let locked = null

const texts = {
  left: "Посмотреть опыт 👀",
  right: "Обо мне 🙂",
  up: "Контакты 📞",
  down: "Навыки 💪"
}

const positions = {
  left: { x: -0.5, y: 0 },
  right: { x: 0.5, y: 0 },
  up: { x: 0, y: -0.5 },
  down: { x: 0, y: 0.5 }
}

async function init() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
  video.srcObject = stream

  const faceMesh = new FaceMesh({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  })

  faceMesh.setOptions({ maxNumFaces: 1 })

  faceMesh.onResults(res => {
    if (!res.multiFaceLandmarks.length) return

    const nose = res.multiFaceLandmarks[0][1]

    let x = nose.x - 0.5
    let y = nose.y - 0.5

    smoothX += (x - smoothX) * 0.06
    smoothY += (y - smoothY) * 0.06

    aim.style.left = `${50 + smoothX * 50}%`
    aim.style.top = `${50 + smoothY * 50}%`

    history.push({ x: smoothX, y: smoothY })
    if (history.length > 10) history.shift()

    let closest = null
    let minDist = Infinity

    Object.entries(positions).forEach(([key, pos]) => {
      const dx = smoothX - pos.x
      const dy = smoothY - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < minDist) {
        minDist = dist
        closest = key
      }
    })

    const variance =
      history.reduce((a, p) => a + Math.abs(p.x - smoothX) + Math.abs(p.y - smoothY), 0) /
      history.length

    if (variance < 0.01) locked = closest
    else locked = null

    cards.forEach(card => {
      card.classList.remove("active", "locked")

      if (card.classList.contains(closest)) {
        card.classList.add("active")
      }

      if (card.classList.contains(locked)) {
        card.classList.add("locked")
      }
    })

    // 💬 THOUGHT
    if (closest) {
      thought.innerText = texts[closest]
      thought.style.opacity = 1
    }

    // 🎯 АКТИВАЦИЯ (кивок)
    if (locked && history.length > 5) {
      const dyMove = history[history.length - 1].y - history[0].y

      if (Math.abs(dyMove) > 0.04) {
        thought.innerText = "Выбрано: " + texts[locked]
      }
    }
  })

  const camera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video })
    }
  })

  camera.start()
}

init()

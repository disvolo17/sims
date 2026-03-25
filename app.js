const video = document.getElementById("video")
const aim = document.getElementById("aim")
const cards = document.querySelectorAll(".card")
const thought = document.getElementById("thought")
const radialMenu = document.getElementById("radialMenu")

const clickSound = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg")

let smoothX = 0
let smoothY = 0
let history = []
let locked = null

let radialItems = []
let radialActive = null

const actions = ["Open", "View", "Edit", "Close"]

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

function showRadialMenu(x, y) {
  radialMenu.innerHTML = ""
  radialMenu.style.display = "block"
  radialMenu.style.left = x + "px"
  radialMenu.style.top = y + "px"

  radialItems = []

  const radius = 80

  actions.forEach((action, i) => {
    const angle = (i / actions.length) * Math.PI * 2

    const item = document.createElement("div")
    item.className = "radial-item"
    item.innerText = action

    item.style.left = 100 + Math.cos(angle) * radius + "px"
    item.style.top = 100 + Math.sin(angle) * radius + "px"

    radialMenu.appendChild(item)
    radialItems.push({ el: item, angle })
  })
}

function hideRadialMenu() {
  radialMenu.style.display = "none"
  radialActive = null
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

    if (variance < 0.01) {
      locked = closest
      showRadialMenu(
        window.innerWidth / 2 + smoothX * 300,
        window.innerHeight / 2 + smoothY * 300
      )
    } else {
      locked = null
      hideRadialMenu()
    }

    cards.forEach(card => {
      card.classList.remove("active", "locked")

      const key = [...card.classList].find(c => positions[c])

      // 🧲 притяжение
      card.style.transform = `
        translate(${smoothX * 20}px, ${smoothY * 20}px)
        scale(${closest === key ? 1.15 : 1})
      `

      if (card.classList.contains(closest)) card.classList.add("active")
      if (card.classList.contains(locked)) card.classList.add("locked")
    })

    if (closest) {
      thought.innerText = texts[closest]
      thought.style.opacity = 1
    }

    if (radialItems.length) {
      let closestItem = null
      let min = Infinity

      radialItems.forEach(item => {
        const dx = Math.cos(item.angle) - smoothX
        const dy = Math.sin(item.angle) - smoothY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < min) {
          min = dist
          closestItem = item
        }
      })

      radialItems.forEach(i => i.el.classList.remove("active"))

      if (closestItem) {
        closestItem.el.classList.add("active")
        radialActive = closestItem
      }
    }

    if (locked && radialActive && history.length > 5) {
      const dyMove = history[history.length - 1].y - history[0].y

      if (Math.abs(dyMove) > 0.04) {
        clickSound.play()
        thought.innerText = "Выбрано: " + radialActive.el.innerText
        hideRadialMenu()
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

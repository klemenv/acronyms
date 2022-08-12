const acronymCardTemplate = document.querySelector("[data-acronym-template]")
const acronymCardContainer = document.querySelector("[data-acronym-cards-container]")
const searchInput = document.querySelector("[data-search]")

const URL = "?search="

let acronyms = []

function triggerSearch(value) {
  searchInput.value = value;
  const trigger = new Event("input");
  searchInput.dispatchEvent(trigger);
}

function fetchAndShow(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      data.forEach(acronym => {
        const card = acronymCardTemplate.content.cloneNode(true).children[0]
        card.querySelector("[data-name]").textContent = acronym.name
        card.querySelector("[data-expanded]").textContent = acronym.expanded
        if (acronym.description) {
          card.querySelector("[data-description]").textContent = acronym.description
        } else {
          card.querySelector("[data-description]").classList.add("hide")
        }
        if (acronym.tags) {
          acronym.tags.forEach(tag => {
            const el = card.querySelector("[data-acronym-tag-template]").content.cloneNode(true).children[0]
            console.log(el)
            el.textContent = tag
            el.href = "javascript: triggerSearch('" + tag + "');";
            card.querySelector("[data-tags]").append(el)
          })
        } else {
          card.querySelector("[data-tags]").classList.add("hide")
        }
        if (acronym.link) {
          card.querySelector("[data-link]").textContent = acronym.link.replace(/(.{100})..+/, "$1...")
          card.querySelector("[data-link]").href = acronym.link
        } else {
          card.querySelector("[data-link]").classList.add("hide")
        }
        acronymCardContainer.append(card)
      })
    })
}

searchInput.addEventListener("input", (e) => {
  var last;
  while (last = acronymCardContainer.lastChild) {
    acronymCardContainer.removeChild(last);
  }

  fetchAndShow(URL + e.target.value)

  /*
  const value = e.target.value.toLowerCase()
  acronyms.forEach(acronym => {
    const isVisible = acronym.name.toLowerCase().includes(value) || acronym.expanded.toLowerCase().includes(value)
    acronym.element.classList.toggle("hide", !isVisible)
  })
  */
})

fetchAndShow(URL)
/*
fetch(url, { cache: "no-cache" })
  .then(res => res.json())
  .then(data => {
    acronyms = data.map(acronym => {
      const card = acronymCardTemplate.content.cloneNode(true).children[0]
      card.querySelector("[data-name]").textContent = acronym.name
      card.querySelector("[data-expanded]").textContent = acronym.expanded
      card.querySelector("[data-description]").textContent = acronym.description
      acronymCardContainer.append(card)
      return { name: acronym.name, expanded: acronym.expanded, element: card }
    })
  })
*/
const acronymCardTemplate = document.querySelector("[data-acronym-template]")
const acronymCardContainer = document.querySelector("[data-acronym-cards-container]")
const searchInput = document.querySelector("[data-search]")

const ADD_URL = "?add=";
const EDIT_URL = "?change=";
const REMOVE_URL = "?remove=";
const SEARCH_URL = "?limit=100&search="
const TAGS_URL = "?tags="

function triggerSearch(value) {
  searchInput.value = value;
  const trigger = new Event("input");
  searchInput.dispatchEvent(trigger);
}

function refreshTags() {
  fetch(TAGS_URL)
    .then(res => res.json())
    .then(data => {
      EditCardHandler.assignTags(data);
    });
}

class AcronymCardHandler {
  /** Assign JSON data to HTML card container */
  static assign(card, data) {

    // Acronym name and long definition are required fields and always available
    card.querySelector("[data-id]").textContent = data.id
    card.querySelector("[data-name]").textContent = data.name
    card.querySelector("[data-definition]").textContent = data.definition

    // Don't hide description to keep the action icons visible
    card.querySelector("[data-description]").textContent = data.description;

    // Hide external link if empty, but also display long links shorter
    if (data.link) {
      card.querySelector("[data-link]").textContent = data.link.replace(/(.{100})..+/, "$1...")
      card.querySelector("[data-link]").href = data.link
    } else {
      card.querySelector("[data-link]").style.display = "none";
    }

    // Instantiate a new div object for each tag for a nicer effect
    if (data.tags) {
      data.tags.forEach(tag => {
        const el = card.querySelector("[data-acronym-tag-template]").content.cloneNode(true).children[0]
        el.textContent = tag
        el.href = "javascript: triggerSearch('" + tag + "');";
        card.querySelector("[data-tags]").append(el)
      })
    } else {
      card.querySelector("[data-tags]").style.display = "none";
    }

    // Change the fields to editable when Edit button is pressed
    card.querySelector("[data-edit]").addEventListener("click", function () {
      // No need to expand the card, its own event listener already did it
      //AcronymCardHandler.enableEdits(card);
      console.log("Want to edit this card?");
    });

    card.querySelector("[data-delete]").addEventListener("click", function () {
      const id = card.querySelector("[data-id]").textContent;
      fetch(REMOVE_URL + id)
        .then(res => res.json())
        .then(data => {
          if (data.status == "ok") {
            acronymCardContainer.removeChild(card);
          }
        });
    });

    // Expand or collapse the acronym details, like tags, description etc.
    card.querySelector("[data-expanded]").style.display = "none";
    card.querySelector("[data-actions]").style.display = "none";
    card.addEventListener("click", function (event) {
      // Ignore event for action icons
      const skip = ["[data-delete]", "[data-edit]"];
      for (const el of skip) {
        if (event.target == card.querySelector(el)) {
          return;
        }
      }

      const content = card.querySelector("[data-expanded]");
      const actions = card.querySelector("[data-actions]");
      if (content.style.display === "block") {
        content.style.display = "none";
        actions.style.display = "none";
        card.classList.remove("active");
      } else {
        content.style.display = "block";
        actions.style.display = "block";
        card.classList.add("active");
      }
    });

  }

  static enableEdits(card) {
    const nameInput = document.createElement("INPUT");
    nameInput.setAttribute("type", "text");
    nameInput.setAttribute("value", card.querySelector("[data-name]").textContent);
    nameInput.setAttribute("placeholder", "ACRONYM");
    card.querySelector("[data-name]").textContent = "";
    card.querySelector("[data-name]").appendChild(nameInput);
  }
}

class EditCardHandler {
  static init() {
    const editCard = document.querySelector("[data-card-edit]");

    editCard.style.display = "none";
    editCard.querySelector("[data-confirm]").addEventListener("click", EditCardHandler.submit);
    editCard.querySelector("[data-cancel]").addEventListener("click", EditCardHandler.cancel);
  }

  static assignTags(tags) {
    const editCard = document.querySelector("[data-card-edit]");
    // Add support for autocompleting the fields
  }

  static submit() {
    const editCard = document.querySelector("[data-card-edit]");

    const acronym = Object();
    acronym.name = editCard.querySelector("[data-name]").value;
    acronym.definition = editCard.querySelector("[data-definition]").value;
    if (acronym.name && acronym.definition) {
      if (editCard.querySelector("[data-description]").value) {
        acronym.description = editCard.querySelector("[data-description]").value;
      }
      if (editCard.querySelector("[data-link]").value) {
        acronym.link = editCard.querySelector("[data-link]").value;
        if (acronym.link.search(/^http[s]?\:\/\//) == -1) {
          acronym.link = "http://" + acronym.link;
        }
      }
      const tags = [];
      ["[data-tag1]", "[data-tag2]", "[data-tag3]", "[data-tag4]", "[data-tag5]"].forEach(el => {
        const tag = editCard.querySelector(el).value;
        if (tag) {
          tags.push(tag);
        }
      });
      if (tags) {
        acronym.tags = tags;
      }

      fetch(ADD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(acronym),
      })
        .then(res => res.json())
        .then(data => {
          console.log(data);
          if (data.status == "ok") {
            EditCardHandler.hide();
            EditCardHandler.clear();

            const card = acronymCardTemplate.content.cloneNode(true).children[0];
            AcronymCardHandler.assign(card, acronym);
            acronymCardContainer.prepend(card);
            refreshTags();
          }
        });
    }
  }

  static cancel() {
    const editCard = document.querySelector("[data-card-edit]");

    // Invalidate the id to prevent accidental submittal
    editCard.querySelector("[data-id]").value = "";
    editCard.style.display = "none";
  }

  static toggle(id = "") {
    const editCard = document.querySelector("[data-card-edit]");

    if (editCard.style.display != "none") {
      editCard.style.display = "none";
    } else {
      editCard.style.display = "block";

      if (!id) {
        acronymCardContainer.prepend(editCard);
      }
    }
  }

  static hide() {
    const editCard = document.querySelector("[data-card-edit]");

    editCard.style.display = "none";
    document.body.append(editCard);
  }

  static clear() {
    const editCard = document.querySelector("[data-card-edit]");
    const fields = [ "[data-id]", "[data-name]", "[data-definition]",
                     "[data-description]", "[data-link]", "[data-tag1]",
                     "[data-tag2]", "[data-tag3]", "[data-tag4]", "[data-tag5]" ]
    fields.forEach(field => {
      editCard.querySelector(field).value = "";
    });
  }
};

searchInput.addEventListener("input", (e) => {
  var last;
  EditCardHandler.hide();
  while (last = acronymCardContainer.lastChild) {
    acronymCardContainer.removeChild(last);
  }

  fetch(SEARCH_URL + e.target.value)
    .then(res => res.json())
    .then(data => {
      data.forEach(acronym => {
        const card = acronymCardTemplate.content.cloneNode(true).children[0];
        AcronymCardHandler.assign(card, acronym);
        acronymCardContainer.append(card);
      })
    })

  /*
  const value = e.target.value.toLowerCase()
  acronyms.forEach(acronym => {
    const isVisible = acronym.name.toLowerCase().includes(value) || acronym.expanded.toLowerCase().includes(value)
    acronym.element.classList.toggle("hide", !isVisible)
  })
  */
})

document.querySelector("[data-add]").addEventListener("click", function () { EditCardHandler.toggle(); });
EditCardHandler.init();
refreshTags();
triggerSearch("")

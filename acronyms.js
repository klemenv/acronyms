const acronymCardTemplate = document.querySelector("[data-acronym-template]");
const acronymCardContainer = document.querySelector("[data-acronym-cards-container]");
const searchInput = document.querySelector("[data-search]");

const ADD_URL    = "acronyms.php?add=";
const GET_URL    = "acronyms.php?get=";
const UPDATE_URL = "acronyms.php?update=";
const REMOVE_URL = "acronyms.php?remove=";
const SEARCH_URL = "acronyms.php?limit=100&search="
const TAGS_URL   = "acronyms.php?tags="

function triggerSearch(value) {
  searchInput.value = value;
  const trigger = new Event("input");
  searchInput.dispatchEvent(trigger);
}

function refreshTags() {
  fetch(TAGS_URL)
    .then(res => res.json())
    .then(data => {
      AutoComplete.items = data;
    });
}

class AutoComplete {
  static items = [];
  static currentFocus = -1;

  static setup(inp) {
    const list = document.querySelector("[data-autocomplete-list]");

    inp.addEventListener("input", function(e) {
      AutoComplete.clear();

      if (!inp.value) {
        return false;
      }

      AutoComplete.currentFocus = -1;
      inp.parentNode.appendChild(list);

      AutoComplete.items.forEach(item => {
        if (item.substr(0, inp.value.length).toUpperCase() == inp.value.toUpperCase()) {
          const el = document.querySelector("[data-autocomplete-item-template]").content.cloneNode(true).children[0];
          el.innerHTML += "<strong>" + item.substr(0, inp.value.length) + "</strong>";
          el.innerHTML += item.substr(inp.value.length);
          el.querySelector("[data-autocomplete-item-value]").value = item;
          list.appendChild(el);

          el.addEventListener("click", function(e) {
            inp.value = this.querySelector("[data-autocomplete-item-value]").value;
            AutoComplete.clear();
          });
        }
      });
    });

    inp.addEventListener("keydown", function(ev) {
      const list = document.querySelector("[data-autocomplete-list]");

      if (ev.keyCode == 40) { // DOWN key
        if (AutoComplete.currentFocus < list.querySelectorAll("[data-autocomplete-item]").length) {
          AutoComplete.currentFocus++;

          list.querySelectorAll("[data-autocomplete-item]").forEach((el, i) => {
            if (i == AutoComplete.currentFocus) {
              el.classList.add("autocomplete-active");
            } else {
              el.classList.remove("autocomplete-active");
            }
          });
        }

      } else if (ev.keyCode == 38) { // UP key
        if (AutoComplete.currentFocus > -1) {
          AutoComplete.currentFocus--;

          list.querySelectorAll("[data-autocomplete-item]").forEach((el, i) => {
            if (i == AutoComplete.currentFocus) {
              el.classList.add("autocomplete-active");
            } else {
              el.classList.remove("autocomplete-active");
            }
          });
        }

      } else if (ev.keyCode == 13) { // ENTER key
        ev.preventDefault();

        list.querySelectorAll("[data-autocomplete-item]").forEach((el, i) => {
          if (i == AutoComplete.currentFocus) {
            el.click();
          }
        });
      }
    });
  }

  static clear() {
    const list = document.querySelector("[data-autocomplete-list]");

    list.querySelectorAll("[data-autocomplete-item]").forEach(el => {
      list.removeChild(el);
    });
  }
};

class AcronymCardHandler {
  static create(data, sibling = null) {
    const card = acronymCardTemplate.content.cloneNode(true).children[0];
    if (sibling) {
      acronymCardContainer.insertBefore(card, sibling);
    } else {
      acronymCardContainer.append(card);
    }

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

    card.querySelector("[data-edit]").addEventListener("click", function () {
      acronymCardContainer.querySelectorAll("[data-card]").forEach(el => {
        el.classList.remove("hide");
      });
      EditCardHandler.copyFromCard(card);
      EditCardHandler.show(card);
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
}

class EditCardHandler {
  static init() {
    const editCard = document.querySelector("[data-card-edit]");

    editCard.style.display = "none";
    editCard.querySelector("[data-confirm]").addEventListener("click", EditCardHandler.submit);
    editCard.querySelector("[data-cancel]").addEventListener("click", function() {
      EditCardHandler.cancel();
      acronymCardContainer.querySelectorAll("[data-card]").forEach(el => {
        el.classList.remove("hide");
      });
    });

    AutoComplete.setup(editCard.querySelector("[data-tag1]"));
    AutoComplete.setup(editCard.querySelector("[data-tag2]"));
    AutoComplete.setup(editCard.querySelector("[data-tag3]"));
    AutoComplete.setup(editCard.querySelector("[data-tag4]"));
    AutoComplete.setup(editCard.querySelector("[data-tag5]"));
  }

  static copyFromCard(card) {
    const editCard = document.querySelector("[data-card-edit]");

    const fields = ["[data-id]", "[data-name]", "[data-definition]",
                    "[data-description]", "[data-link]" ];
    fields.forEach(field => {
      editCard.querySelector(field).value = card.querySelector(field).textContent;
    });

    // Treat tags differently
    card.querySelectorAll("[data-tag]").forEach((el, i) => {
      editCard.querySelector("[data-tag"+(i+1).toString()+"]").value = el.textContent;
    });
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

      const id = editCard.querySelector("[data-id]").value;
      const url = (id ? UPDATE_URL + id : ADD_URL);

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(acronym),
      })
        .then(res => res.json())
        .then(data => {
          if (data.status == "ok") {
            // Fetch data from the database, even though we just inserted it
            fetch(GET_URL + data.id)
              .then(res => res.json())
              .then(acronym => {
                // Delete the old card if it exists
                if (id) {
                  const oldCard = editCard.nextSibling;
                  if (oldCard.querySelector("[data-id]").textContent == data.id) {
                    acronymCardContainer.removeChild(oldCard);
                  }
                }

                AcronymCardHandler.create(acronym, editCard);

                // Hide the edit card
                EditCardHandler.hide();
                EditCardHandler.clear();
                refreshTags();
              });
          }
        });
    }
  }

  static cancel() {
    const editCard = document.querySelector("[data-card-edit]");

    EditCardHandler.clear();
    EditCardHandler.hide();
  }

  static toggle() {
    const editCard = document.querySelector("[data-card-edit]");
    const id = editCard.querySelector("[data-id]").value;

    if (id) {
      // Edit card must be displayed from a previously attempted editing of existing acronym
      EditCardHandler.clear();
      EditCardHandler.hide();
    }

    if (editCard.style.display != "none") {
      EditCardHandler.hide();
    } else {
      EditCardHandler.show();
    }
  }

  static show(sibling) {
    const editCard = document.querySelector("[data-card-edit]");

    if (sibling) {
      acronymCardContainer.insertBefore(editCard, sibling);
      sibling.classList.add("hide");
    } else {
      acronymCardContainer.prepend(editCard);
    }
    editCard.style.display = "block";
  }

  static hide() {
    const editCard = document.querySelector("[data-card-edit]");

    editCard.style.display = "none";
    document.body.append(editCard);
  }

  static clear() {
    const editCard = document.querySelector("[data-card-edit]");
    const fields = ["[data-id]", "[data-name]", "[data-definition]",
      "[data-description]", "[data-link]", "[data-tag1]",
      "[data-tag2]", "[data-tag3]", "[data-tag4]", "[data-tag5]"]
    fields.forEach(field => {
      editCard.querySelector(field).value = "";
    });
  }
};

let searching = false;
searchInput.addEventListener("input", (e) => {
  let last;
  if (searching) {
    return false;
  }

  searching = true;
  EditCardHandler.hide();
  while (last = acronymCardContainer.lastChild) {
    acronymCardContainer.removeChild(last);
  }

  fetch(SEARCH_URL + e.target.value)
    .then(res => res.json())
    .then(data => {
      data.forEach(acronym => AcronymCardHandler.create(acronym))
      searching = false;
    })
    .catch(error => {
      searching  = false;
    });

  /*
  const value = e.target.value.toLowerCase()
  acronyms.forEach(acronym => {
    const isVisible = acronym.name.toLowerCase().includes(value) || acronym.expanded.toLowerCase().includes(value)
    acronym.element.classList.toggle("hide", !isVisible)
  })
  */
})

document.addEventListener("click", function (e) {
    AutoComplete.clear();
});

document.querySelector("[data-add]").addEventListener("click", function () { 
  acronymCardContainer.querySelectorAll("[data-card]").forEach(el => {
    el.classList.remove("hide");
  });
  EditCardHandler.toggle();
});

EditCardHandler.init();
refreshTags();
const query = window.location.search.replace(/^\?/, '');
triggerSearch(query);

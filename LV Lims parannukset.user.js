// ==UserScript==
// @name         LV Lims parannukset
// @namespace    http://github.com/lewisohn/lims
// @version      0.1.2
// @downloadURL  https://github.com/lewisohn/lims/raw/main/LV%20Lims%20parannukset.user.js
// @updateURL    https://github.com/lewisohn/lims/raw/main/LV%20Lims%20parannukset.user.js
// @description  Kokoelma hyödyllisiä parannuksia
// @author       Oliver Lewisohn
// @match        https://mlabs0014:8443/labvantage/rc*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*jshint esversion: 6 */

var widened, hinted;

window.addEventListener("load", () => { // jotkut parannukset vaativat sen, että tarkistetaan tilanne aina kun sivu muuttuu
    (new MutationObserver(check)).observe(document, { childList: true, subtree: true });
    widened = false;
    hinted = false;
});

window.addEventListener('keydown', (e) => { // palautetaan Ctrl+A:n alkuperäistoiminta "valitse kaikki"
    if (e.key == "a" && e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.stopImmediatePropagation();
    }
}, true);

if (/^.*CRL_(Request|Sample)AuditView.*$/.test(window.location.toLocaleString())) { // loki-ikkunan koko määräytyy kunnolla ja vierityspalkit toimivat
    document.getElementById("auditdatadiv").removeAttribute("style");
}

if (window.frameElement) {
    let url = window.parent.location.toLocaleString();
    if (/^dlg_frame[0-9]+$/.test(window.frameElement.id) && (/^.*CRL_(Request|Sample).*Maint1$/.test(url))) { // tilauksen tai näytteen muokkaussivu, päivämäärämodaali
        let focused = setInterval(() => {
            let timefield = document.getElementById("timefield");
            if (timefield) {
                timefield.focus();
                timefield.select();
                clearInterval(focused);
            }
        }, 100);
    }
}

function check() {
    if (window.frameElement) {
        if (window.frameElement.id == "_nav_frame1") {
            let url = window.parent.location.toLocaleString();
            if (/^.*CRL_Request.*Maint1$/.test(url)) { // tilaussivu
                test(document.getElementById("dynamicgridA_tabtitle")); // onko tilauksella näytteitä?
                test(document.getElementById("dynamicgridB_tabtitle")); // onko tilauksen jakelu tyhjä?
                dd(); // onko "DD"-ruutu määräajan automaattisen laskemisen ohittamiselle valittu?
                widen(); // levennetään tilauksen kuvauskentät
            }
            if (/^.*CRL_Sample.*Maint1$/.test(url)) { // näytesivu
                test(document.getElementById("dynamicdatasetgrid_tabtitle")); // onko näytteellä testejä?
            }
            if (/^.*CRL_(Request|Sample).*Maint1$/.test(url)) { // tilaus- tai näytesivu
                rightClickToClear();
            }
            if (/^.*CRL_Sample.*Maint1MultiTest$/.test(url)) { // näytteen muokkaussivu
                hint();
            }
        }
    }
}

function widen() {
    if (!widened) {
        let descriptions = document.querySelectorAll("#request_fieldset td span:nth-child(2) input");
        if (descriptions.length > 0) {
            descriptions.forEach((description) => {
                description.setAttribute("size", "54");
            });
        }
        widened = true;
    }
}

function hint() {
    if (!hinted) {
        let workitemid = document.getElementById("dynamicmultimaint0_workitemid");
        if (workitemid) {
            workitemid.setAttribute("placeholder", "Uusi testi");
        }
        hinted = true;
    }
}

function test(element) { // apufunktio
    if (element) {
        orange(element.parentElement, (element.innerHTML == " (0)"));
    }
}

function orange(what, bool) { // apufunktio
    what.style.background = (bool ? "orange" : "none");
    what.style.boxShadow = (bool ? "0 0 0 3px orange" : "none");
}

function dd() { // apufunktio
    let checkboxes = document.querySelectorAll('[id^="dynamicgridA"][id$="_duedtoverrideflag"]:not([id*="colheader"])');
    if (checkboxes.length > 0) {
        checkboxes.forEach((checkbox) => {
            if (!checkbox.hasAttribute("data-dd-override")) {
                let i = checkbox.id.match(/dynamicgridA(\d+)_duedtoverrideflag/)[1];
                let input = document.getElementById("dynamicgridA" + i + "_duedt");
                let image = document.getElementById("dynamicgridA" + i + "_duedt_lookup");
                checkbox.addEventListener("click", () => {
                    if (checkbox.checked) {
                        input.removeAttribute("readonly");
                        input.classList.remove("lockedfield");
                        image.removeAttribute("style");
                    }
                    else {
                        input.setAttribute("readonly", "readonly");
                        input.classList.add("lockedfield");
                        image.setAttribute("style", "display: none;");
                    }
                });
                checkbox.setAttribute("data-dd-override", "");
            }
        });
    }
}

function rightClickToClear() {
    let imgs = document.querySelectorAll(".lookup_img");
    if (imgs.length > 0) {
        imgs.forEach((img) => {
            if (!img.hasAttribute("data-rightclick-override")) {
                let input = img.closest("td").previousElementSibling.querySelector("input:first-of-type");
                img.addEventListener("contextmenu", (e) => {
                    if ((e.button == 2) && (input.value != "")) {
                        input.focus();
                        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", code: "Backspace", keyCode: "8" }));
                        input.removeAttribute("readonly");
                        e.preventDefault();
                        return false;
                    }
                });
                img.setAttribute("data-rightclick-override", "");
            }
        });
    }
}

// ==UserScript==
// @name         LV Lims parannukset
// @namespace    http://github.com/lewisohn/lims
// @version      0.1.8
// @description  Kokoelma hyödyllisiä parannuksia
// @author       Oliver Lewisohn
// @match        https://mlabs0014:8443/labvantage/rc*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*jshint esversion: 6 */

var widened = false;

window.addEventListener("load", () => { // jotkut parannukset vaativat sen, että tarkistetaan tilanne aina kun sivu muuttuu
    (new MutationObserver(check)).observe(document, { childList: true, subtree: true });
});

window.addEventListener('keydown', (e) => { // palautetaan Ctrl+A:n alkuperäistoiminta "valitse kaikki"
    if (e.key == "a" && e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.stopImmediatePropagation();
    }
}, true);

window.addEventListener("beforeunload", saveSessionData); // muistetaan missä oltiin ennen sivun uudelleenlatausta

function check() {
    if (window.frameElement) {
        if (window.frameElement.id == "_nav_frame1") {
            let url = window.parent.location.toLocaleString();
            if (/^.*CRL_Request.*Maint1$/.test(url)) { // tilaussivu
                isZero(document.getElementById("dynamicgridA_tabtitle")); // onko tilauksella näytteitä?
                isZero(document.getElementById("dynamicgridB_tabtitle")); // onko tilauksen jakelu tyhjä?
                dd(); // sallitaan määräajan valitsemista heti "DD"-ruudun valittua ilman välitallennusta
                widen(); // levennetään tilauksen kuvauskentät
                setTimeout(restoreSessionStorageData, 500); // muistetaan missä oltiin ennen sivun uudelleenlatausta
                orderConfirmationScrollFix(); // korjataan tilausvahvistusvälilehden taulukko
            }
            if (/^.*CRL_Sample.*Maint1$/.test(url)) { // näytesivu
                isZero(document.getElementById("dynamicdatasetgrid_tabtitle")); // onko näytteellä testejä?
            }
            if (/^.*CRL_(Request|Sample).*Maint1$/.test(url)) { // tilaus- tai näytesivu
                rightClickToClear(); // oikea klikkaus tyhjentää hakukentän (toimii tällä hetkellä tilaus- ja näytesivuilla)
                checkForWeekend(); // määräaikakenttä värjäytyy oranssiksi, jos päivä osuu viikonloppuun
            }
            if (/^.*CRL_Sample.*Maint1MultiTest$/.test(url)) { // näytteen muokkaussivu
                hint(); // näytteen muokkaussivun testikenttään työkaluvihje
                checkForWeekend(); // määräaikakenttä värjäytyy oranssiksi, jos päivä osuu viikonloppuun
            }
        }
    }
}

function saveSessionData() {
    if (window.frameElement && (window.frameElement.id == "_nav_frame1")) {
        if (/^.*CRL_Request.*Maint1$/.test(window.parent.location.toLocaleString())) {
            console.log("Button pressed!");
            sessionStorage.setItem("tab", document.querySelector("._selected").parentElement.id);
            sessionStorage.setItem("active", getActiveElement().id);
            sessionStorage.setItem("scrollTop", document.querySelector("#maint_td").scrollTop);
            sessionStorage.setItem("scrollLeft", document.querySelector("#dynamicgridA_tablediv").scrollLeft);
        }
    }
}

if (window.frameElement && (window.frameElement.id == "_nav_frame1")) { // mahdollistetaan useamman rivin liittäminen näytteen taustakenttään
    if (document.querySelector("#pr0_u_sampleorigin")) {
        document.querySelector("#pr0_u_sampleorigin").addEventListener("paste", (e) => {
            e.preventDefault();
            navigator.clipboard.readText().then((clipText) => {
                let textArea = document.activeElement;
                let text = textArea.value;
                text = text.slice(0, textArea.selectionStart) + clipText + text.slice(textArea.selectionEnd);
                textArea.value = text;
                textArea.dispatchEvent(new Event("change"));
            });
        });
    }
}

function getActiveElement(element = document.activeElement) { // apufunktio
    const shadowRoot = element.shadowRoot;
    const contentDocument = element.contentDocument;
    if (shadowRoot && shadowRoot.activeElement) {
        return getActiveElement(shadowRoot.activeElement);
    }
    if (contentDocument && contentDocument.activeElement) {
        return getActiveElement(contentDocument.activeElement);
    }
    return element;
}


if (/^.*CRL_(Request|Sample)AuditView.*$/.test(window.location.toLocaleString())) { // loki-ikkunan koko määräytyy kunnolla ja vierityspalkit toimivat
    document.getElementById("auditdatadiv").removeAttribute("style");
}

if (window.frameElement) {
    let url = window.parent.location.toLocaleString();
    if (/^dlg_frame[0-9]+$/.test(window.frameElement.id)) {
        if (/^.*CRL_(Request|Sample).*Maint1$/.test(url)) { // kun päivämäärämodaali avataan, siirretään kursori kellonaikakenttään
            let focused = setInterval(() => {
                let field = document.getElementById("timefield");
                if (field) {
                    field.focus();
                    field.select();
                    clearInterval(focused);
                }
            }, 100);
        }
        else if (/^.*CRL_CustomerList.*$/.test(url)) { // kun asiakasrekisterin kontaktimodaali avataan, siirretään kursori etunimikenttään
            setTimeout(() => {
                let field = document.getElementById("maint_iframe").contentDocument.body.querySelector("#pr0_firstname"); // ruma kuin mikä
                if (field) {
                    field.focus();
                    field.select();
                }
            }, 500);
        }
    }
}

function orderConfirmationScrollFix() { // korjataan tilausvahvistusvälilehden taulukko
    let orderConfirmationGrid = document.getElementById("dynamicgrid_tablediv");
    if (orderConfirmationGrid && !orderConfirmationGrid.hasAttribute("data-scroll-fix")) {
        orderConfirmationGrid.addEventListener("scroll", () => {
            orderConfirmationGrid.style.removeProperty("height");
            orderConfirmationGrid.style.removeProperty("overflow");
            orderConfirmationGrid.style.removeProperty("border-bottom");
        });
        orderConfirmationGrid.setAttribute("data-scroll-fix", "");
    }
}

function restoreSessionStorageData() { // muistetaan missä oltiin ennen sivun uudelleenlatausta
    handleSessionStorageItem("tab", (id) => {
        const tabElement = document.getElementById(id);
        if (tabElement) {
            tabElement.click();
        }
    });

    handleSessionStorageItem("active", (id) => {
        const activeElement = document.getElementById(id);
        if (activeElement) {
            activeElement.focus();
        }
    });

    handleSessionStorageItem("scrollTop", (scrollTop) => {
        const maintTdElement = document.getElementById("maint_td");
        if (maintTdElement) {
            maintTdElement.scroll(0, scrollTop);
        }
    });

    handleSessionStorageItem("scrollLeft", (scrollLeft) => {
        const dynamicGridTableDivElement = document.getElementById("dynamicgridA_tablediv");
        if (dynamicGridTableDivElement) {
            dynamicGridTableDivElement.scroll(scrollLeft, 0);
        }
    });
}

function handleSessionStorageItem(key, action) {
    const item = sessionStorage.getItem(key);
    if (item) {
        action(item);
        sessionStorage.removeItem(key);
    }
}

function checkForWeekend() { // määräaikakenttä värjäytyy oranssiksi, jos päivä osuu viikonloppuun
    let ddfields = document.querySelectorAll('[id$="_duedt"]');
    if (ddfields.length > 0) {
        ddfields.forEach(ddfield => {
            if (!ddfield.hasAttribute("data-weekend-check")) {
                ddfield.addEventListener("change", (e) => {
                    if (ddfield.value.length > 0) {
                        let parts = ddfield.value.match(/[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}/)[0].split(".");
                        let date = new Date(parts[2], parts[1] - 1, parts[0]);
                        orange(ddfield, (date.getDay() % 6 == 0));
                    }
                    else orange(ddfield, false);
                });
                ddfield.setAttribute("data-weekend-check", "");
            }
        });
    }
}

function widen() { // levennetään tilauksen kuvauskentät
    if (!widened) {
        let descriptions = document.querySelectorAll("#request_fieldset td span:nth-child(2) input");
        if (descriptions.length > 0) {
            descriptions.forEach((description) => {
                description.setAttribute("size", "57");
            });
        }
        widened = true;
    }
}

function hint() { // näytteen muokkaussivun testikenttään työkaluvihje
    let workitemid = document.getElementById("dynamicmultimaint0_workitemid");
    if (workitemid) {
        workitemid.setAttribute("placeholder", "Uusi testi");
    }
}

function isZero(element) { // apufunktio
    if (element) {
        orange(element.parentElement, (element.innerHTML == " (0)"));
    }
}

function orange(what, bool) { // korostetaan välilehden otsikko, jos se on tyhjä (esim. tilauksen jakelu)
    what.style.background = (bool ? "orange" : "none");
    what.style.boxShadow = (bool ? "0 0 0 3px orange" : "none");
}

function dd() { // sallitaan määräajan valitsemista heti "DD"-ruudun valittua ilman välitallennusta
    let checkboxes = document.querySelectorAll('[id^="dynamicgridA"][id$="_duedtoverrideflag"]:not([id*="colheader"])');
    if (checkboxes.length > 0) {
        checkboxes.forEach(checkbox => {
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

function rightClickToClear() { // oikea klikkaus tyhjentää hakukentän (toimii tällä hetkellä tilaus- ja näytesivuilla)
    let imgs = document.querySelectorAll(".lookup_img, .datelookup_img");
    if (imgs.length > 0) {
        imgs.forEach(img => {
            if (!img.hasAttribute("data-rightclick-override")) {
                let input = img.closest("td").previousElementSibling.querySelector("input:first-of-type");
                img.addEventListener("contextmenu", (e) => {
                    if ((e.button == 2) && (input.value != "")) {
                        e.preventDefault();
                        input.focus();
                        if (input.className == "lookup_img") {
                            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", code: "Backspace", keyCode: "8" }));
                            input.removeAttribute("readonly");
                        } else {
                            input.value = "";
                            input.dispatchEvent(new Event("change"));
                        }
                        return false;
                    }
                });
                img.setAttribute("data-rightclick-override", "");
            }
        });
    }
}

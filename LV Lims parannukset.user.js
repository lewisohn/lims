// ==UserScript==
// @name         LV Lims parannukset
// @namespace    http://github.com/lewisohn/lims
// @version      0.1.9
// @description  Kokoelma hyödyllisiä parannuksia
// @author       Oliver Lewisohn
// @match        https://mlabs0014:8443/labvantage/rc*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/* jshint esversion: 6 */

let url = top.location.href;

window.addEventListener("load", () => { // some improvements require us to monitor the page for changes
    (new MutationObserver(check)).observe(document, { childList: true, subtree: true });
});

window.addEventListener('keydown', (e) => { // let Ctrl+A select all again (Ctrl+Alt+A bypasses this fix)
    if (e.key == "a" && e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.stopImmediatePropagation();
    }
}, true);

window.addEventListener("beforeunload", saveSessionData); // return to previous position on refresh

function check() {
    if (top.location.href != url) {
        url = top.location.href;
        urlChanged(); // call this if the URL has changed, which doesn't necessarily trigger a new page load
    }
    if (window.frameElement) {
        if (window.frameElement.id == "_nav_frame1") {
            if (/^.*CRL_Request.*Maint1$/.test(url)) { // request page
                isZero(document.getElementById("dynamicgridA_tabtitle")); // check if the request has samples
                isZero(document.getElementById("dynamicgridB_tabtitle")); // check if the request has a distribution
                dd(); // allow the user to input a date after selecting the due date override without having to save the request
                rightClickToClear(); // right clicking a search or calendar icon clears the associated field
                checkForWeekend(); // check if the due date has landed on a weekend
            }
            else if (/^.*CRL_Sample.*Maint1$/.test(url)) { // sample page
                isZero(document.getElementById("dynamicdatasetgrid_tabtitle")); // check if the sample has tests
                rightClickToClear(); // right clicking a search or calendar icon clears the associated field
                checkForWeekend(); // check if the due date has landed on a weekend
            }
            else if (/^.*LV_Navigator$/.test(url)) {
                // TODO: make the request and sample page features work in the tree view as well
            }
            else if (/^.*CRL_Sample.*Maint1MultiTest$/.test(url)) { // sample editing page
                checkForWeekend(); // check if the due date has landed on a weekend
                hint(); // placeholder text for the new test box
            }
        }
    }
}

function urlChanged() {
    if (window.frameElement) {
        if (/^.*CRL_Request.*Maint1$/.test(url)) { // request page
            dateSelectorFix();
            orderConfirmationFix();
            orderWidthFix();
            setTimeout(restoreSessionStorageData, 500);
        }
        if (/^.*CRL_Sample.*Maint1$/.test(url)) { // sample page
            dateSelectorFix();
            pasteFix();
        }
        if (/^.*LV_Navigator$/.test(url) && /^.*CRL_Sample.*Maint1$/.test(document.location.href)) { // tree view
            pasteFix();
        }
        if (/^.*CRL_CustomerList.*$/.test(url)) { // customer register
            contactFix();
        }
    }
    else {
        if (/^.*CRL_(Request|Sample)AuditView.*$/.test(url)) { // log
            logFix();
        }
    }
}

urlChanged(); // call this on page load

/* Helper functions */

function waitFor(selector, callback) { // wait for AJAX to load a given element
    let timer = setInterval(() => {
        if (document.querySelector(selector)) {
            callback(document.querySelector(selector));
            clearInterval(timer);
        }
    }, 100);
}

function getActiveElement(element = document.activeElement) { // get the active element recursively through iframes
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

function isZero(element) { // check if an element is zero
    if (element) {
        orange(element.parentElement, (element.innerHTML == " (0)"));
    }
}

function orange(what, bool) { // decorate something orange, or not
    what.style.background = (bool ? "orange" : "none");
    what.style.boxShadow = (bool ? "0 0 0 3px orange" : "none");
}

/* This function runs once before page unload */

function saveSessionData() { // save page position on refresh
    if (window.frameElement && (window.frameElement.id == "_nav_frame1")) {
        if (/^.*CRL_Request.*Maint1$/.test(url)) {
            sessionStorage.setItem("tab", document.querySelector("._selected").parentElement.id);
            sessionStorage.setItem("active", getActiveElement().id);
            sessionStorage.setItem("scrollTop", document.querySelector("#maint_td").scrollTop);
            sessionStorage.setItem("scrollLeft", document.querySelector("#dynamicgridA_tablediv").scrollLeft);
        }
    }
}

/* These functions run once on page load */

function dateSelectorFix() { // select the time field when opening the date modal
    if (/^dlg_frame[0-9]+$/.test(window.frameElement.id)) {
        waitFor("#timefield", (field) => {
            field.focus();
            field.select();
        });
    }
}

function pasteFix() { // allow pasting multiple lines to sample origin
    waitFor("#pr0_u_sampleorigin", (origin) => {
        origin.addEventListener("paste", (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.readText().then((clipText) => {
                let textArea = document.activeElement;
                let text = textArea.value;
                text = text.slice(0, textArea.selectionStart) + clipText + text.slice(textArea.selectionEnd);
                textArea.value = text;
                textArea.dispatchEvent(new Event("change"));
            });
        }, true);
    });
}

function orderConfirmationFix() { // fix order confirmation list size and scroll
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

function orderWidthFix() { // widen the request page's description fields and invoice reference field
    let descriptions = document.querySelectorAll("#request_fieldset td span:nth-child(2) input");
    if (descriptions.length > 0) {
        descriptions.forEach((description) => {
            description.setAttribute("size", "57");
        });
    }
    waitFor("#pr0_inv_reference", (reference) => {
        reference.setAttribute("size", "40");
    });
}

function restoreSessionStorageData() { // load page position after refresh
    let tab = sessionStorage.getItem("tab");
    if (tab && document.getElementById(tab)) {
        document.getElementById(tab).click();
        sessionStorage.removeItem("tab");
    }
    let active = sessionStorage.getItem("active");
    if (active && document.getElementById(active)) {
        document.getElementById(active).focus();
        sessionStorage.removeItem("active");
    }
    let scrollTop = sessionStorage.getItem("scrollTop");
    if (scrollTop && document.getElementById("maint_td")) {
        document.getElementById("maint_td").scroll(0, scrollTop);
        sessionStorage.removeItem("scrollTop");
    }
    let scrollLeft = sessionStorage.getItem("scrollLeft");
    if (scrollLeft && document.getElementById("dynamicgridA_tablediv")) {
        document.getElementById("dynamicgridA_tablediv").scroll(scrollLeft, 0);
        sessionStorage.removeItem("scrollLeft");
    }
}

function contactFix() { // select the first name field when opening the contact modal
    if (/^dlg_frame[0-9]+$/.test(window.frameElement.id)) {
        setTimeout(() => {
            let field = document.getElementById("maint_iframe").contentDocument.body.querySelector("#pr0_firstname"); // can't use waitFor here because of the need to look inside the iframe
            if (field) {
                field.focus();
                field.select();
            }
        }, 500);
    }
}

function logFix() { // fix log window size and scrolling
    document.getElementById("auditdatadiv").removeAttribute("style");
}

/* These functions run whenever the page is updated */

function checkForWeekend() { // check if the due date has landed on a weekend
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

function hint() { // placeholder text for the new test box
    waitFor("#dynamicmultimaint0_workitemid", (workitemid) => {
        workitemid.setAttribute("placeholder", "Uusi testi");
    });
}


function dd() { // allow the user to input a date after selecting the due date override without having to save the request
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

function rightClickToClear() { // right clicking a search or calendar icon clears the associated field
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
                            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", code: "Backspace", keyCode: "8" })); // jshint ignore:line
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

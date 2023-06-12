// ==UserScript==
// @name         LV Lims parannukset
// @namespace    http://github.com/lewisohn/lims
// @version      0.2.1
// @description  Kokoelma hyödyllisiä parannuksia
// @author       Oliver Lewisohn
// @match        https://mlabs0014:8443/labvantage/rc*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/* jshint esversion: 6 */

/* Global variables */

let windowURL = top.location.href;

/* Event listeners */

window.addEventListener("load", () => { // watch for page changes
    (new MutationObserver(domChanged)).observe(document, { childList: true, subtree: true });
});

window.addEventListener("popstate", urlChanged()); // watch for navigation

window.addEventListener('keydown', (event) => { // let Ctrl+A select all again (Ctrl+Shift+A and Ctrl+Alt+A bypass this fix)
    if (event.key === "a" && event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.stopImmediatePropagation();
    }
}, true);

window.addEventListener("beforeunload", saveSessionData); // save request page position on refresh

/* These functions run once on page load */

function urlChanged() {
    if (window.frameElement) {
        let frameURL = window.frameElement.contentWindow.location.href;
        if (window.frameElement.id === "_nav_frame1" || window.frameElement.name === "pageframe") {
            if (/CRL_Request.*Maint1$/.test(frameURL)) {
                urlChangedRequestPage();
            }
            if (/CRL_Sample.*Maint1$/.test(frameURL)) {
                urlChangedSamplePage();
            }
        }
        else if (/^dlg_frame[0-9]+$/.test(window.frameElement.id)) {
            if (/calendar.jsp$/.test(frameURL)) {
                dateSelectorFix();
            }
        }
        else if (window.frameElement.id == "maint_iframe") {
            if (/CRL_ContactMaint/.test(frameURL)) {
                contactFix();
            }
        }
    }
    else if (/CRL_(Request|Sample)AuditView.*$/.test(windowURL)) {
        logFix();
    }
}

function urlChangedRequestPage() {
    scrollFix();
    orderWidthFix();
    setTimeout(restoreSessionStorageData, 500);
}

function urlChangedSamplePage() {
    pasteFix();
}

function dateSelectorFix() { // select the time field when opening the date modal
    waitFor("#timefield", (timefield) => {
        timefield.focus();
        timefield.select();
    });
}

function pasteFix() { // allow pasting multiple lines to sample origin
    waitFor("#pr0_u_sampleorigin", (sampleorigin) => {
        if (!sampleorigin.hasAttribute("data-paste-fix")) {
            sampleorigin.addEventListener("paste", (event) => {
                event.preventDefault();
                event.stopPropagation();
                navigator.clipboard.readText().then((clipText) => {
                    let textArea = document.activeElement;
                    let text = textArea.value;
                    text = text.slice(0, textArea.selectionStart) + clipText + text.slice(textArea.selectionEnd);
                    textArea.value = text;
                    textArea.dispatchEvent(new Event("change"));
                });
            }, true);
            sampleorigin.setAttribute("data-paste-fix", "");
        }
    });
}

function scrollFix() { // fix order confirmation list size and scroll. TODO: make this work on first load without needing to be scrolled
    waitFor("#dynamicgrid_tablediv", (tablediv) => {
        if (!tablediv.hasAttribute("data-scroll-fix")) {
            tablediv.addEventListener("scroll", () => {
                tablediv.style.removeProperty("height");
                tablediv.style.removeProperty("overflow");
                tablediv.style.removeProperty("border-bottom");
            });
            tablediv.setAttribute("data-scroll-fix", "");
        }
    });
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

function contactFix() { // select the first name field when opening the contact modal
    waitFor("#pr0_firstname", (firstname) => {
        firstname.focus();
        firstname.select();
    });
}

function logFix() { // fix log window size and scrolling
    document.getElementById("auditdatadiv").removeAttribute("style");
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

document.querySelector("#layout_header > div.header_back").style.background = "BlueViolet";
document.querySelector("#layout_header > div.header_front > table > tbody > tr > td > div > div.link_btns_cont").style.background = "BlueViolet";

/* These functions run whenever the page is updated */

function domChanged() {
    if (windowURL !== top.location.href) {
        windowURL = top.location.href;
        urlChanged(); // call this if the URL has changed, which doesn't necessarily trigger a new page load
    }
    if (window.frameElement) {
        if (window.frameElement.id === "_nav_frame1") {
            if (/CRL_Request.*Maint1$/.test(windowURL)) {
                domChangedRequestPage();
            }
            else if (/CRL_Sample.*Maint1$/.test(windowURL)) {
                domChangedSamplePage();
            }
            else if (/CRL_Sample.*Maint1MultiTest$/.test(windowURL)) {
                domChangedSampleEditingPage();
            }
        }
        else if (window.frameElement.name === "pageframe") {
            if (/LV_Navigator$/.test(windowURL)) {
                waitFor("#savedata > input[type=hidden]:nth-child(1)", (input) => {
                    if (input.value === "Request") {
                        domChangedRequestPage();
                    } else if (input.value === "Sample") {
                        domChangedSamplePage();
                    }
                });
            }
        }
    }
}

function domChangedRequestPage() {
    orangeIfZero(document.getElementById("dynamicgridA_tabtitle")); // check if the request has samples
    orangeIfZero(document.getElementById("dynamicgridB_tabtitle")); // check if the request has a distribution
    ddOverride();
    rightClickClears();
    weekendCheck();
}

function domChangedSamplePage() {
    orangeIfZero(document.getElementById("dynamicdatasetgrid_tabtitle")); // check if the sample has tests
    rightClickClears();
    weekendCheck();
}

function domChangedSampleEditingPage() {
    weekendCheck();
    hint();
}

function weekendCheck() { // check if the due date has landed on a weekend
    let ddfields = document.querySelectorAll('[id$="_duedt"]');
    if (ddfields.length > 0) {
        ddfields.forEach(ddfield => {
            if (!ddfield.hasAttribute("data-weekend-check")) {
                ddfield.addEventListener("change", () => {
                    if (ddfield.value.length > 0) {
                        let parts = ddfield.value.match(/[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}/)[0].split(".");
                        let date = new Date(parts[2], parts[1] - 1, parts[0]);
                        orange(ddfield, (date.getDay() % 6 === 0));
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


function ddOverride() { // allow the user to input a date after selecting the due date override without having to save the request
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

function rightClickClears() { // right clicking a search or calendar icon clears the associated field
    let imgs = document.querySelectorAll(".lookup_img, .datelookup_img");
    if (imgs.length > 0) {
        imgs.forEach(img => {
            if (!img.hasAttribute("data-rightclick-clears")) {
                let input = img.closest("td").previousElementSibling.querySelector("input:first-of-type");
                img.addEventListener("contextmenu", (event) => {
                    if ((event.button === 2) && (input.value !== "")) {
                        event.preventDefault();
                        input.focus();
                        if (input.className === "lookup_img") {
                            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", code: "Backspace", keyCode: "8" })); // jshint ignore:line
                            input.removeAttribute("readonly");
                        } else {
                            input.value = "";
                            input.dispatchEvent(new Event("change"));
                        }
                        return false;
                    }
                });
                img.setAttribute("data-rightclick-clears", "");
            }
        });
    }
}

/* This function runs once before page unload */

function saveSessionData() { // save page position on refresh
    if (window.frameElement && (window.frameElement.id === "_nav_frame1")) {
        if (/CRL_Request.*Maint1$/.test(windowURL)) {
            sessionStorage.setItem("tab", document.querySelector("._selected").parentElement.id);
            sessionStorage.setItem("active", getActiveElement().id);
            sessionStorage.setItem("scrollTop", document.querySelector("#maint_td").scrollTop);
            sessionStorage.setItem("scrollLeft", document.querySelector("#dynamicgridA_tablediv").scrollLeft);
        }
    }
}

/* Helper functions */

function waitFor(selector, callback) { // wait for AJAX to load a given element, but give up after five seconds
    let counter = 0;
    let timer = setInterval(() => {
        if (document.querySelector(selector)) {
            callback(document.querySelector(selector));
            clearInterval(timer);
        } else if (counter >= 50) {
            clearInterval(timer);
        } else {
            counter++;
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

function orangeIfZero(element) { // check if an element is zero
    if (element) {
        orange(element.parentElement, (element.innerHTML === " (0)"));
    }
}

function orange(what, bool) { // decorate something orange, or not
    what.style.background = (bool ? "orange" : "none");
    what.style.boxShadow = (bool ? "0 0 0 3px orange" : "none");
}

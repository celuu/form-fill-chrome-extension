const extractJobDataFromYC = () => {
  return document.getElementsByClassName("company-details")[0]?.textContent;
};

const extractHtml = () => {
  const html = document.documentElement.outerHTML;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script, style").forEach((el) => el.remove());
  doc.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
  return doc.documentElement.outerHTML;
};

const extractFormFields = () => {
  const fields = {};
  document.querySelectorAll("input, textarea, select").forEach((el, index) => {
    const id = el.id || el.name || `unnamed_${index}`;
    const label = el.labels?.[0]?.innerText?.trim() || el.placeholder || "";
    fields[id] = {
      label,
      type: el.type || el.tagName.toLowerCase(),
      selector: el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : null,
      value: el.value || "",
    };
  });
  return fields;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.answer) {
    const textarea = document.querySelector("textarea");
    if (textarea) textarea.value = message.answer;
  } else if (message.error) {
    console.error("Error from background:", message.error);
  } else if (message.action === "autofill") {
    const textarea = document.querySelector("textarea");
    textarea.value = "Generating response...";
    const jobData = extractJobDataFromYC();
    chrome.runtime.sendMessage({
      action: "generateAnswer",
      jobData: jobData,
      source: "yc",
    });
  } else if (message.action === "general") {
    const htmlData = extractHtml();
    const formFields = extractFormFields();
    chrome.runtime.sendMessage({
      action: "generateAnswer",
      html: htmlData,
      form: formFields,
      source: "general",
    });
  } else if (message.action === "fillForm") {
    const data = message.data;
    console.log("DATA", data);

    if (!data || typeof data !== "object") {
      console.error("Invalid form data:", data);
      return;
    }

    const normalize = (str = "") => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeSelect = (selector) => {
      try {
        return document.querySelector(selector);
      } catch {
        return null;
      }
    };

    const setNativeChecked = (input, checked = true) => {
      try {
        const desc = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "checked"
        );
        if (desc && desc.set) desc.set.call(input, checked);
        else input.checked = checked;
      } catch {
        input.checked = checked;
      }
    };

    const setNativeValue = (el, val) => {
      try {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) desc.set.call(el, val);
        else el.value = val;
      } catch {
        el.value = val;
      }
    };

    const clickEl = (el) => {
      try {
        el.click();
        return true;
      } catch {
        try {
          el.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
          return true;
        } catch {
          return false;
        }
      }
    };

    const dispatchInputChange = (el) => {
      try {
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } catch {}
      try {
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    };

    Object.entries(data).forEach(([key, value]) => {
      let el =
        safeSelect(`#${CSS.escape(key)}`) ||
        safeSelect(`[name="${key}"]`) ||
        safeSelect(`[id*="${key}"]`) ||
        safeSelect(`[name*="${key}"]`);

      if (!el) {
        const keyNorm = normalize(key);
        const allCandidates = [
          ...document.querySelectorAll(
            "input, textarea, select, [role='radio'], [role='checkbox'], button, label"
          ),
        ];

        if (keyNorm.includes("name")) {
          el =
            allCandidates.find((i) =>
              /name|first|last/i.test(
                i.name || i.id || i.placeholder || i.innerText || ""
              )
            ) || null;
        } else if (keyNorm.includes("email")) {
          el =
            allCandidates.find((i) =>
              /email/i.test(
                i.name || i.id || i.placeholder || i.innerText || ""
              )
            ) || null;
        } else if (keyNorm.includes("phone")) {
          el =
            allCandidates.find((i) =>
              /phone|mobile/i.test(
                i.name || i.id || i.placeholder || i.innerText || ""
              )
            ) || null;
        }
      }

      if (!el) {
        console.warn("⚠️ No element found for key:", key);
        return;
      }

      if (!value && value !== 0 && value !== false) {
        return;
      }

      if (el.tagName === "SELECT") {
        const options = [...el.options];
        const match = options.find(
          (opt) =>
            normalize(opt.textContent || opt.value) === normalize(String(value))
        );
        if (match) el.value = match.value;
        else el.value = value;
        dispatchInputChange(el);
        return;
      }

      if (el.tagName === "INPUT" && el.type === "radio" && value === "on") {
        let success = false;

        try {
          if (!el.checked) {
            setNativeChecked(el, true);
            el.focus && el.focus();
            dispatchInputChange(el);
            el.dispatchEvent(
              new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window,
              })
            );
          }
          success = el.checked === true;
        } catch (e) {
          success = false;
        }

        if (!success) {
          const innerInput =
            el.querySelector && el.querySelector('input[type="radio"]');
          if (innerInput) {
            setNativeChecked(innerInput, true);
            innerInput.focus && innerInput.focus();
            dispatchInputChange(innerInput);
            clickEl(innerInput);
            success = innerInput.checked === true;
          }
        }

        if (!success) {
          const label =
            (el.id && document.querySelector(`label[for="${el.id}"]`)) ||
            el.closest("label");
          if (label) {
            clickEl(label);
            success =
              el.checked === true ||
              (el.querySelector &&
                el.querySelector('input[type="radio"]')?.checked);
          }
        }

        if (!success) {
          const candidate = [
            ...document.querySelectorAll('input[type="radio"]'),
          ].find(
            (r) =>
              r.id === key ||
              r.name === key ||
              (r.id && r.id.includes(key)) ||
              (r.name && r.name.includes(key))
          );
          if (candidate) {
            setNativeChecked(candidate, true);
            candidate.focus && candidate.focus();
            dispatchInputChange(candidate);
            clickEl(candidate);
            success = candidate.checked === true;
          }
        }

        if (!success) {
          const roleRadio = [
            ...document.querySelectorAll('[role="radio"], [aria-checked]'),
          ].find((x) => {
            const txt =
              (x.innerText || "") +
              " " +
              (x.getAttribute("aria-label") || "") +
              " " +
              (x.getAttribute("data-testid") || "");
            return normalize(txt).includes(normalize(key));
          });
          if (roleRadio) {
            clickEl(roleRadio);
            if (roleRadio.setAttribute)
              roleRadio.setAttribute("aria-checked", "true");
            dispatchInputChange(roleRadio);
            success = true;
          }
        }

        if (!success) console.warn("⚠️ Failed to set radio for key:", key);
        return;
      }

      if (
        el.getAttribute &&
        (el.getAttribute("role") === "radio" ||
          el.hasAttribute("aria-checked")) &&
        value === "on"
      ) {
        const clicked = clickEl(el);
        if (!clicked && el.setAttribute)
          el.setAttribute("aria-checked", "true");
        dispatchInputChange(el);
        return;
      }

      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        if (el.type === "checkbox") {
          const desired = !!value;
          setNativeChecked(el, desired);
          dispatchInputChange(el);
          return;
        }

        setNativeValue(el, String(value));
        dispatchInputChange(el);
        return;
      }

      if (value === "on") {
        clickEl(el);
      }
    });
  }

});

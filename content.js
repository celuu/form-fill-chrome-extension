const extractJobDataFromYC = () => {
  return document.getElementsByClassName("company-details")[0]?.textContent;
};

const extractHtml = () => {
  const html = document.documentElement.outerHTML;
  const parser = new DOMParser();
  const page = parser.parseFromString(html, "text/html");
  page.querySelectorAll("script, style").forEach((ele) => ele.remove());
  page
    .querySelectorAll("[style]")
    .forEach((ele) => ele.removeAttribute("style"));
  return page.documentElement.outerHTML;
};

const extractFormFields = () => {
  const fields = {};
  document.querySelectorAll("input, textarea").forEach((ele, index) => {
    if (!ele.id) {
      ele.id = `auto-id-${ele.tagName.toLowerCase()}-${index}`;
    }
    const id = ele.id;
    const label = ele.labels?.[0]?.innerText?.trim() || ele.placeholder || "";
    fields[id] = {
      label,
      type: ele.type || ele.tagName.toLowerCase(),
      selector: ele.id,
      value: ele.value || "",
    };
  });
  return fields;
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.answer) {
    const textarea = document.querySelector("textarea");
    if (textarea) textarea.value = message.answer;
  } else if (message.error) {
    console.error("error", message.error);
  } else if (message.action === "autofill") {
    const textarea = document.querySelector("textarea");
    textarea.value = "generating response...";
    const jobData = extractJobDataFromYC();
    chrome.runtime.sendMessage({
      action: "generateAnswer",
      jobData,
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
      console.error("invalid data", data);
      return;
    }

    const reduceSelector = (selector) => {
      try {
        return document.querySelector(selector);
      } catch {
        return null;
      }
    };

    const setValue = (ele, val) => {
      try {
        const proto = Object.getPrototypeOf(ele);
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) desc.set.call(ele, val);
        else ele.value = val;
      } catch {
        ele.value = val;
      }
    };
    const dispatchInputChange = (ele) => {
      if (!ele) return;

      if (ele.type === "radio") {
        const name = ele.name;
        const form = ele.form || document;

        if (name) {
          const group = form.querySelectorAll(
            `input[type="radio"][name="${name}"]`
          );
          group.forEach((radio) => {
            if (radio !== ele && radio.checked) {
              radio.checked = false;
              radio.dispatchEvent(new Event("change", { bubbles: true }));
            }
          });
        }

        ele.checked = true;
        ele.dispatchEvent(new Event("input", { bubbles: true }));
        ele.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        ele.dispatchEvent(new Event("input", { bubbles: true }));
        ele.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    Object.entries(data).forEach(([key, value]) => {
      if (!value) return;

      const ele =
        reduceSelector(`#${CSS.escape(key)}`) ||
        reduceSelector(`[id*="${key}"]`) || 
      reduceSelector(`[name*="${key}"]`)

      if (!ele) {
        console.warn("no key found for", key);
        return;
      }

      if (ele.type === "radio") {
        const radios = document.querySelectorAll(
          `input[type="radio"][name="${ele.name}"]`
        );
        let matched = false;

        radios.forEach((radio) => {
          const labelText =
            radio.labels?.[0]?.innerText?.trim().toLowerCase() || "";
          if (
            radio.value.toLowerCase() === String(value).toLowerCase() ||
            labelText.includes(String(value).toLowerCase())
          ) {
            radio.checked = true;
            dispatchInputChange(radio);
            matched = true;
          }
        });

      if (!matched) console.warn(`No matching radio for "${key}" = "${value}"`);return;
      } else if (ele.tagName === "INPUT") {
        setValue(ele, String(value));
        dispatchInputChange(ele);
      } else if (ele.tagName === "TEXTAREA") {
        setValue(ele, String(value));
        dispatchInputChange(ele);
      }
    });
  }
});

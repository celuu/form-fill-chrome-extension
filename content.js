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
    const id = ele.id || ele.name || `unnamed_${index}`;
    const label = ele.labels?.[0]?.innerText?.trim() || ele.placeholder || "";
    fields[id] = {
      label,
      type: ele.type || ele.tagName.toLowerCase(),
      selector: ele.id
        ? `#${ele.id}`
        : ele.name
        ? `[name="${ele.name}"]`
        : `[class*="${ele.className}"]`,
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
      try {
        ele.dispatchEvent(new Event("input", { bubbles: true }));
      } catch {}
      try {
        ele.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    };

    Object.entries(data).forEach(([key, value]) => {
      if (!value) return;

      if (key.startsWith("christine")) {
        console.log("we in here")
      }

      const ele =
        reduceSelector(`#${CSS.escape(key)}`) ||
        reduceSelector(`[name="${key}"]`) ||
        reduceSelector(`[id*="${key}"]`) ||
        reduceSelector(`[class*="${key}"]`)

      if (!ele) {
        console.warn("no key found for", key);
        return;
      }

      if (ele.tagName === "INPUT") {
        setValue(ele, String(value));
        dispatchInputChange(ele);
      } else if (ele.tagName === "TEXTAREA") {
        setValue(ele, String(value));
        dispatchInputChange(ele);
      }
    });
  }
});

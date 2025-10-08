// injected into webpage
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
    chrome.runtime.sendMessage({ action: "generateAnswer", jobData: jobData, source: "yc" });
  }  else if (message.action === "general") {
    const htmlData = extractHtml();
    const formFields = extractFormFields();
    chrome.runtime.sendMessage({ action: "generateAnswer", html: htmlData, form: formFields, source: "general" });
  }else if (message.action === "fillForm") {
    const data = message.data;
    console.log("DATA", data);

    if (!data || typeof data !== "object") {
      console.error("Invalid form data:", data);
      return;
    }

    const normalize = (str = "") =>
      str.toLowerCase().replace(/[^a-z0-9]/g, "");

    Object.entries(data).forEach(([key, value]) => {
      let el =
        document.querySelector(`#${key}`) ||
        document.querySelector(`[name="${key}"]`) ||
        document.querySelector(`[id*="${key}"]`) ||
        document.querySelector(`[name*="${key}"]`);

      if (!el) {
        const keyNorm = normalize(key);
        const allInputs = [
          ...document.querySelectorAll("input, textarea, select"),
        ];

        if (keyNorm.includes("name")) {
          el =
            allInputs.find(
              (i) =>
                /name|first|last/i.test(i.name || i.id || i.placeholder || "")
            ) || null;
        } else if (keyNorm.includes("email")) {
          el =
            allInputs.find(
              (i) =>
                /email/i.test(i.name || i.id || i.placeholder || "")
            ) || null;
        } else if (keyNorm.includes("phone")) {
          el =
            allInputs.find(
              (i) =>
                /phone|mobile/i.test(i.name || i.id || i.placeholder || "")
            ) || null;
        }
      }

      if (el && value) {
        if (["INPUT", "TEXTAREA"].includes(el.tagName)) {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (el.tagName === "SELECT") {
          el.value = value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }

        console.log(`✅ Filled ${key} → ${el.name || el.id || "unknown"}`);
      } else {
        console.warn(`⚠️ No match for key: ${key}`);
      }
    });
  }
});
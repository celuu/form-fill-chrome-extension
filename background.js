chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "generateAnswer") {
    (async () => {
      try {
        const resumeUrl = chrome.runtime.getURL("/resume.txt");
        const resumeResponse = await fetch(resumeUrl);
        const resumeText = await resumeResponse.text();

        const requestSource = request.source;
        const jobDescription = request.jobData || "";
        const html = request.html || "";
        const formFields = request.form || "";

        let systemMessage = "";
        let prompt = "";

        console.log(formFields, "fields")
        console.log(JSON.stringify(formFields, null, 2), "jsonfields");
        if (requestSource === "yc") {
          systemMessage = `
            You are a helpful assistant for writing YC job application responses.
            Always write in first person, at least 50 words, directly copy-pastable into a form.
            Do not add markdown, comments, or extra text.
          `;
          prompt = `
            Use the following resume and job description to generate your answer:
            Resume:
            ${resumeText}

            Job Description:
            ${jobDescription}
          `;
        } else {
          systemMessage = `You are a strict web form parser. Your task is to output ONLY valid JSON where each key is an input field ID, or className or name and each value is the corresponding information from the applicant's resume.

          Rules:
          1. Use only the information explicitly provided in the resume. Do NOT make up or guess names, emails, LinkedIn URLs, or other personal details.
          2. If the resume does not include a value for a field, leave it as an empty string.
          3. Include all form fields in the JSON output, even if the value is empty.
          4. Do NOT include any text, explanations, markdown, or extra formatting — output JSON only.
          5. Maintain the field IDs exactly as they appear in the form (do not change them).
          
          Your JSON output should be directly usable to autofill the form.`;
          prompt = `
            Use the following resume, page HTML, and form fields to generate a JSON object:
            Personal Context:
              Name: Christine Luu
              Email: christine.e.luu@gmail.com
              Phone: (925) 895-6431
              Location: San Francisco, CA
              LinkedInUrl: https://www.linkedin.com/in/christineeluu/
              Github URL: https://github.com/celuu
              Gender: Female
              Hispanic or Latino: No
              Protected Veteran: No,
              Has Disability: No,
              Legally Allowed to Work in the United States: Yes
            Resume:
            ${resumeText}

            HTML:
            ${html}

            Form Fields:
            ${JSON.stringify(formFields, null, 2)}
          `;
        }

        const requestBody = {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
        };

        if (requestSource === "general") {
          requestBody.response_format = { type: "json_object" };
        }


        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAIAPIKEY}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        const data = await response.json();
        const output =
          data?.choices?.[0]?.message?.content?.trim() || "No response";

          console.log(output, "OUTPUT")

        if (sender?.tab?.id) {
          if (requestSource === "general") {
            try {
              const parsed = JSON.parse(output);
              chrome.tabs.sendMessage(sender.tab.id, {
                action: "fillForm",
                data: parsed,
              });
            } catch {
              chrome.tabs.sendMessage(sender.tab.id, { answer: output });
            }
          } else {
            chrome.tabs.sendMessage(sender.tab.id, { answer: output });
          }
        }
      } catch (err) {
        console.error("Error:", err);
        if (sender?.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, { error: err.message });
        }
      }
    })();

    return true;
  }
});
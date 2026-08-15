/**
 * GoogleVisionProvider.js
 *
 * Budget Blossom
 * OCR Provider
 *
 * Connects Budget Blossom to the Supabase
 * receipt-ocr Edge Function.
 */

export default class GoogleVisionProvider {
  async scan(file) {
    if (!file) {
      throw new Error("No document was selected.");
    }

    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL;

    const supabaseAnonKey =
      import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error(
        "VITE_SUPABASE_URL is not configured."
      );
    }

    if (!supabaseAnonKey) {
      throw new Error(
        "VITE_SUPABASE_ANON_KEY is not configured."
      );
    }

    // Convert the selected file to Base64
    const imageBase64 =
      await this.fileToBase64(file);

    console.log(
      "Sending document to Supabase OCR:",
      file.name
    );

    const response = await fetch(
      `${supabaseUrl}/functions/v1/receipt-ocr`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },

        body: JSON.stringify({
          imageBase64,
          filename: file.name,
        }),
      }
    );

    const data = await response.json();

    console.log(
      "Supabase OCR response:",
      data
    );

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Google Vision OCR failed."
      );
    }

    if (!data.success) {
      throw new Error(
        data?.error ||
          "OCR was unsuccessful."
      );
    }

    return {
      provider: "google-vision",

      filename: file.name,

      confidence: 0.98,

      text: data.text || "",

      raw: data.raw || {},
    };
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const result = reader.result;

          if (
            typeof result !== "string"
          ) {
            reject(
              new Error(
                "Unable to convert file to Base64."
              )
            );
            return;
          }

          // Remove the data URL prefix.
          // Example:
          // data:image/jpeg;base64,XXXX
          const base64 =
            result.split(",")[1];

          if (!base64) {
            reject(
              new Error(
                "Unable to extract Base64 image data."
              )
            );
            return;
          }

          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read the selected file."
          )
        );
      };

      reader.readAsDataURL(file);
    });
  }
}

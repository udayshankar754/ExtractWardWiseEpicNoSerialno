const express = require("express");
const fs = require("fs");
const pdf = require("pdf-parse");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer"); // Use csv-writer package
const app = express();
const PORT = process.env.PORT || 3000;

const extractDataFromPDF2 = (dataBuffer) => {
  return pdf(dataBuffer)
    .then((data) => {
      let extractText = data?.text;
      extractText = extractText.replace(/\s+/g, " ").trim();
      console.log(">>>>>",data?.text)
      if (!extractText) {
        return []; // Handle case where there's no text in the PDF.
      }

      const regex = /[A-Za-z]{3}\d+/g; // Match any 3 letters (A-Z or a-z) followed by digits
      const matchedNumber = [...extractText.matchAll(/I\s*(\d+)\s*1/g)].map(match => match[1]);
      const number = matchedNumber;
      console.log('mathed element:.....', number)
      const rec = extractText
        .match(regex)
        ?.map((i) => (i.length == 10 ? i : null))
        .filter((i) => i !== null);

      if (!rec) {
        return []; // No matches found.
      }

      return rec?.map((i) => ({ epicNO: i }));
    })
    .catch((error) => {
      console.error("Error extracting data from PDF:", error);
      return []; // Return empty array on error
    });
};

app.get("/extract", (req, res) => {
  const folderPath =
    "C:/Users/Administrator/Downloads/ExtractWardWiseEpicNoSerialno/ExtractWardWiseEpicNoSerialno/ExtractWardWiseEpicNoSerialno/input"; // Path to your folder
  const outputDir =
    "C:/Users/Administrator/Downloads/ExtractWardWiseEpicNoSerialno/ExtractWardWiseEpicNoSerialno/ExtractWardWiseEpicNoSerialno/output"; // Target directory to save CSV
  let datatobeREquired = [];

  if (!fs.existsSync(folderPath)) {
    return res.status(400).json({ error: "Folder not found" });
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Error reading folder" });
    }

    const pdfFiles = files.filter((file) => file.endsWith(".pdf"));

    if (pdfFiles.length === 0) {
      return res
        .status(400)
        .json({ error: "No PDF files found in the folder" });
    }

    const extractedDataPromises = pdfFiles.map((fileName) => {
      return new Promise((resolve, reject) => {
        const filePath = path.join(folderPath, fileName);

        fs.readFile(filePath, (err, dataBuffer) => {
          if (err) {
            return reject(err);
          }

          extractDataFromPDF2(dataBuffer)
            .then((extractedData) => {
              extractedData
                .filter((i) => i?.epicNO !== undefined)
                .forEach((item, index) => {
                  datatobeREquired.push({
                    fileName,
                    epicNO: item.epicNO,
                    serial_no: index
                  });
                });
              // fs.unlinkSync(filePath);
              resolve();
            })
            .catch((error) => {
              // fs.unlinkSync(filePath);
              reject(error);
            });
        });
      });
    });

    Promise.all(extractedDataPromises)
      .then(() => {
        const csvFilePath = path.join(outputDir, "extractedData.csv");

        const csvWriter = createObjectCsvWriter({
          path: csvFilePath,
          header: [
            { id: "serial_no", title: "Serial No" },
            { id: "fileName", title: "File Name" },
            { id: "epicNO", title: "Epic No" },
          ],
        });

        csvWriter
          .writeRecords(datatobeREquired)
          .then(() => {
            res.json({
              message: "Data extracted and saved to CSV",
              filePath: csvFilePath,
            });
          })
          .catch((error) => {
            res
              .status(500)
              .json({ error: "Error writing CSV file", details: error });
          });
      })
      .catch((error) => {
        res
          .status(500)
          .json({ error: "Failed to extract data from PDFs", details: error });
      });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

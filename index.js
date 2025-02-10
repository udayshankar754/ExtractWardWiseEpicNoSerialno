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
      let matches = extractText.split(" िल ं ग");

      if (!extractText) {
        return []; // Handle case where there's no text in the PDF.
      }
      matches.shift();

      if (!matches) {
        return []; // No matches found.
      }

      let matcheData = matches.map((i) => {
        const matches = i.split("*");
        // console.log(matches[0])
        let requiredData;
        if (matches[0].includes("HR")) {
          // [ '      प\n\nष\n1458HR/03/16/0012192 ' ]

          let rec = matches[0]?.split("HR");

          let epicNo = "HR" + rec[1]?.trim();

          let serialNo = rec[0]?.split(" ");
          serialNo = serialNo[serialNo?.length - 1];
          requiredData = {
            epicNo: epicNo,
            serialNo: serialNo,
          };
        } else {
          let rec = matches[0].split(/(?=[A-Z]{3})/);
          let serialNo = rec[0]?.split(" ");
          serialNo = serialNo[serialNo?.length - 1];

          requiredData = {
            epicNO: rec[1]?.trim(),
            serialNo: serialNo,
          };
        }
        return requiredData;
      });

      return matcheData;
    })
    .catch((error) => {
      console.error("Error extracting data from PDF:", error);
      return []; // Return empty array on error
    });
};

app.get("/extract", (req, res) => {

  const folderPath =
    "C:/Users/Administrator/Desktop/uday_15_11_24/test/2025/ExtractWardWiseEpicNoSerialno/tes"; // Path to your folder
  const outputDir =
    "C:/Users/Administrator/Desktop/uday_15_11_24/test/2025/ExtractWardWiseEpicNoSerialno/output"; // Target directory to save CSV
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
                .filter(
                  (i) => i?.epicNO !== undefined && i?.serialNo !== undefined
                )
                .forEach((item) => {
                  datatobeREquired.push({
                    fileName,
                    epicNO: item.epicNO,
                    serialNo: item.serialNo,
                  });
                });
              fs.unlinkSync(filePath);
              resolve();
            })
            .catch((error) => {
              fs.unlinkSync(filePath);
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
            { id: "fileName", title: "File Name" },
            { id: "epicNO", title: "Epic No" },
            { id: "serialNo", title: "Serial No" },
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

// --- DOM Element References ---
const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const outfitSelect = document.getElementById('outfit-select') as HTMLSelectElement;
const backgroundSelect = document.getElementById('background-select') as HTMLSelectElement;
const lightingSelect = document.getElementById('lighting-select') as HTMLSelectElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;

const resultPanel = document.getElementById('result-panel') as HTMLElement;
const placeholder = document.getElementById('placeholder') as HTMLDivElement;
const loading = document.getElementById('loading') as HTMLDivElement;
const resultDisplay = document.getElementById('result-display') as HTMLDivElement;
const resultImage = document.getElementById('result-image') as HTMLImageElement;
const downloadBtn = document.getElementById('download-btn') as HTMLAnchorElement;
const startOverBtn = document.getElementById('start-over-btn') as HTMLButtonElement;
const errorDisplay = document.getElementById('error-display') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;


// --- State Management ---
let uploadedImage: { base64: string; mimeType: string } | null = null;

// --- API Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Functions ---

/**
 * Converts a File object to a base64 encoded string.
 */
function fileToBase64(file: File): Promise<{ base64: string, mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Handles the image upload event.
 */
async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    try {
      uploadedImage = await fileToBase64(file);
      imagePreview.src = `data:${uploadedImage.mimeType};base64,${uploadedImage.base64}`;
      imagePreviewContainer.hidden = false;
      generateBtn.disabled = false;
    } catch (error) {
      console.error('Error reading file:', error);
      showError('Could not read the selected file. Please try another image.');
      resetToInitialState();
    }
  }
}

/**
 * Shows the specified UI view within the result panel.
 */
function showView(view: 'placeholder' | 'loading' | 'result' | 'error') {
  placeholder.hidden = view !== 'placeholder';
  loading.hidden = view !== 'loading';
  resultDisplay.hidden = view !== 'result';
  errorDisplay.hidden = view !== 'error';
}

/**
 * Displays an error message in the UI.
 */
function showError(message: string) {
    errorMessage.textContent = message;
    showView('error');
}

/**
 * Handles the headshot generation process.
 */
async function generateHeadshot() {
  if (!uploadedImage) {
    showError('Please upload an image first.');
    return;
  }

  showView('loading');
  generateBtn.disabled = true;

  const outfit = outfitSelect.value;
  const background = backgroundSelect.value;
  const lighting = lightingSelect.value;

  const prompt = `Transform this photo into a high-resolution, photorealistic professional headshot. The person should be wearing ${outfit}. The background should be ${background}. The lighting should be ${lighting}. It is critical to maintain the person's exact facial features, expression, and any visible tattoos for identity consistency. Do not change their face or ethnicity.`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: uploadedImage.base64,
                        mimeType: uploadedImage.mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    // Find the image part in the response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
        const base64Image = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType || 'image/png';
        const imageUrl = `data:${mimeType};base64,${base64Image}`;
        resultImage.src = imageUrl;
        downloadBtn.href = imageUrl;
        showView('result');
    } else {
        showError('The model did not return an image. Please try again with a different photo or prompt.');
    }

  } catch (error) {
    console.error('API Error:', error);
    showError('An error occurred while generating the headshot. Please try again.');
  } finally {
    generateBtn.disabled = false;
  }
}

/**
 * Resets the application to its initial state.
 */
function resetToInitialState() {
  showView('placeholder');
  imageUpload.value = '';
  uploadedImage = null;
  imagePreviewContainer.hidden = true;
  imagePreview.src = '#';
  generateBtn.disabled = true;
}

// --- Event Listeners ---
imageUpload.addEventListener('change', handleImageUpload);
generateBtn.addEventListener('click', generateHeadshot);
startOverBtn.addEventListener('click', resetToInitialState);

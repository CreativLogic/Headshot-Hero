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
const hatSelect = document.getElementById('hat-select') as HTMLSelectElement;
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
const previewBtn = document.getElementById('preview-btn') as HTMLButtonElement;
const errorDisplay = document.getElementById('error-display') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;

// Regeneration controls
const viewSelect = document.getElementById('view-select') as HTMLSelectElement;
const customViewInput = document.getElementById('custom-view-input') as HTMLTextAreaElement;
const regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;

// Modal elements
const previewModal = document.getElementById('preview-modal') as HTMLDivElement;
const modalImage = document.getElementById('modal-image') as HTMLImageElement;
const closeModalBtn = document.getElementById('close-modal-btn') as HTMLSpanElement;


// --- State Management ---
let uploadedImage: { base64: string; mimeType: string } | null = null;
let currentResultImage: { base64: string; mimeType: string } | null = null;


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
  regenerateBtn.disabled = true;

  const outfit = outfitSelect.value;
  const background = backgroundSelect.value;
  const lighting = lightingSelect.value;
  const hatSelection = hatSelect.value;

  let hatInstruction = '';
  if (hatSelection === 'remove') {
      hatInstruction = 'If the person is wearing a hat, remove it.';
  } else if (hatSelection !== 'none') {
      hatInstruction = `The person should be wearing ${hatSelection}.`;
  }

  const prompt = `Transform this photo into a high-resolution, photorealistic professional headshot. The person should be wearing ${outfit}. ${hatInstruction} The background should be ${background}. The lighting should be ${lighting}. It is critical to maintain the person's exact facial features, expression, and any visible tattoos for identity consistency. Do not change their face or ethnicity.`.trim().replace(/\s+/g, ' ');

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

        currentResultImage = { base64: base64Image, mimeType: mimeType };

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
    regenerateBtn.disabled = false;
  }
}

/**
 * Regenerates the headshot with a new view, using the current result as a base.
 */
async function regenerateView() {
    if (!currentResultImage) {
        showError('No image to regenerate. Please generate a headshot first.');
        return;
    }

    showView('loading');
    generateBtn.disabled = true;
    regenerateBtn.disabled = true;

    const outfit = outfitSelect.value;
    const background = backgroundSelect.value;
    const lighting = lightingSelect.value;
    const hatSelection = hatSelect.value;
    
    const customInstruction = customViewInput.value.trim();
    const selectedView = viewSelect.value;
    const changeInstruction = customInstruction || selectedView; // Prioritize custom input

    let hatInstruction = '';
    if (hatSelection === 'remove') {
        hatInstruction = 'If the person is wearing a hat, remove it.';
    } else if (hatSelection !== 'none') {
        hatInstruction = `The person should be wearing ${hatSelection}.`;
    }

    const prompt = `Using the provided image as a base, create a new version of this professional headshot with the following change: "${changeInstruction}". Maintain the same person, outfit (${outfit}), background (${background}), lighting (${lighting}), and overall style. ${hatInstruction} It is critical to maintain the person's exact facial features for identity consistency. Do not change their face.`.trim().replace(/\s+/g, ' ');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: currentResultImage.base64,
                            mimeType: currentResultImage.mimeType,
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

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData) {
            const base64Image = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType || 'image/png';
            
            currentResultImage = { base64: base64Image, mimeType: mimeType };
            
            const imageUrl = `data:${mimeType};base64,${base64Image}`;
            resultImage.src = imageUrl;
            downloadBtn.href = imageUrl;
            showView('result');
        } else {
            showError('The model did not return a new image. Please try again.');
        }

    } catch (error) {
        console.error('API Error during regeneration:', error);
        showError('An error occurred while regenerating the headshot. Please try again.');
    } finally {
        generateBtn.disabled = false;
        regenerateBtn.disabled = false;
    }
}

/**
 * Resets the application to its initial state.
 */
function resetToInitialState() {
  showView('placeholder');
  imageUpload.value = '';
  uploadedImage = null;
  currentResultImage = null;
  imagePreviewContainer.hidden = true;
  imagePreview.src = '#';
  generateBtn.disabled = true;
  customViewInput.value = '';
  closePreviewModal();
}

/**
 * Opens the preview modal.
 */
function openPreviewModal() {
    if (resultImage.src && resultImage.src !== location.href) {
        modalImage.src = resultImage.src;
        previewModal.style.display = 'flex';
    }
}

/**
 * Closes the preview modal.
 */
function closePreviewModal() {
    previewModal.style.display = 'none';
}


// --- Event Listeners ---
imageUpload.addEventListener('change', handleImageUpload);
generateBtn.addEventListener('click', generateHeadshot);
regenerateBtn.addEventListener('click', regenerateView);
startOverBtn.addEventListener('click', resetToInitialState);

// Modal event listeners
previewBtn.addEventListener('click', openPreviewModal);
closeModalBtn.addEventListener('click', closePreviewModal);
previewModal.addEventListener('click', (event) => {
    // Close modal if the background overlay is clicked, but not the image itself
    if (event.target === previewModal) {
        closePreviewModal();
    }
});
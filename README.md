# NutriScan

A free, open-source nutrition tracker that lets you scan product nutrition labels with your camera and track your diet with custom macros.

## Features

- **Photo OCR**: Take a photo of a nutrition label and extract the data automatically
- **Custom Macros**: Track calories, sodium, saturated fats, or any nutrient you care about
- **Meal Planning**: Build custom meals by specifying grams of each product
- **Free & No Ads**: Completely free to use, no ads, no paywalls

## How It Works

1. Take a photo of a product's nutrition label
2. The app uses OCR to extract the nutrition data
3. Save the product to your library
4. Build meals by adding products with custom gram amounts
5. Track your daily intake across all your custom macros

## Setup

No build step required. Just open `index.html` in a modern browser.

For development:

```bash
npx serve .
```

## Testing

```bash
npm test
```

## What's Not Done Yet

- Integration with a real OCR API (currently uses a mock)
- Cloud sync across devices
- Barcode scanning for product lookup
- Recipe sharing features
- Export data to CSV
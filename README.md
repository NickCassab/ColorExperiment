# Color Space Visualizer

A 3D interactive visualization tool that transforms images into point clouds representing their color distributions in RGB and HSV color spaces.

![Color-Experiments](https://github.com/user-attachments/assets/97cbfdd0-df1d-4975-b14e-792b0dd3c075)


## Overview

Color Space Visualizer is an interactive web application that allows users to upload images and visualize their color distributions in three-dimensional space. The app provides two visualization modes:

- **RGB Mode**: Maps colors based on their Red, Green, and Blue values
- **HSV Mode**: Maps colors based on Hue, Saturation, and Value

The visualization dynamically transitions between these two representations with smooth animations, helping users understand how colors are distributed and related in different color spaces.

## Features

- **Image Upload**: Upload any image via drag-and-drop or file selector
- **Dual Color Spaces**: Toggle between RGB and HSV color representations
- **Smooth Transitions**: Animated transitions between color spaces
- **Interactive Controls**: Rotate and zoom to explore the color distribution
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Informative UI**: Detailed instructions and coordinate explanations

## How It Works

1. **Upload an Image**: Drag and drop an image or use the file selector
2. **View in RGB**: By default, each pixel is positioned in 3D space where:
   - X-axis represents Red (0-255)
   - Y-axis represents Green (0-255)
   - Z-axis represents Blue (0-255)
3. **Toggle to HSV**: Switch to view the same colors represented where:
   - X-axis represents Hue (color tone)
   - Y-axis represents Saturation (color intensity)
   - Z-axis represents Value (brightness)
4. **Explore**: Rotate, zoom, and examine clusters to identify color patterns

## Technical Implementation

The application is built with:

- **React**: For UI and component architecture
- **Three.js with React Three Fiber**: For 3D rendering and visualization
- **Canvas API**: For image processing and pixel extraction

For performance optimization, the application:

- Dynamically adjusts sampling rate based on image size
- Uses WebGL for hardware-accelerated rendering
- Implements efficient memory management for large images

## Getting Started

### Prerequisites

- Node.js (v14 or later recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/color-space-visualizer.git
cd color-space-visualizer
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage Examples

### Photography Analysis

Photographers can use this tool to:
- Analyze color harmony in their compositions
- Compare color palettes across different images
- Identify dominant color themes

### Graphic Design

Designers can leverage the visualizer to:
- Extract cohesive color schemes from reference images
- Understand color relationships for branding projects
- Explore color distributions in existing designs

### Educational Tool

The application serves as an excellent educational resource for:
- Teaching color theory fundamentals
- Demonstrating the difference between additive (RGB) and perceptual (HSV) color models
- Visualizing abstract color concepts in an intuitive way

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js community for their excellent 3D visualization library
- React Three Fiber for simplifying Three.js integration with React
- All contributors and feedback providers

---

*Built for color enthusiasts and visualization geeks everywhere*

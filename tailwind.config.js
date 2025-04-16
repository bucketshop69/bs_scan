/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                bio: {
                    base: '#031a1f',        // Very deep, desaturated teal/blue - like abyssal water
                    surface: '#103841',     // Slightly lighter, murky teal-gray - sediments, rocks
                    'text-primary': '#d0ede0',  // Pale, slightly greenish off-white - phosphorescence
                    'text-secondary': '#7a9e9f', // Muted, soft teal-gray - less focus
                    primary: '#33ffbb',     // Vibrant, glowing aqua-green - key bioluminescence
                    secondary: '#ff7f50',   // Deep, rich coral/unusual orange - contrasting discovery/warning
                    border: '#1d595e',      // Muted, dark teal - subtle structure
                }
            },
        },
    },
    plugins: [],
} 
// ============================================
// CHESS PIECE SVG THEMES (Alpha, Merida, Classic)
// ============================================
// High-quality SVG vectors scaled for 45x45 viewBox, crisp at any resolution.

const PIECE_SETS = {
  // 1. ALPHA (Cburnett / Wikipedia Standard)
  alpha: {
    // White pieces
    'P': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    'N': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.84 4.34-5 4.5-2.66.2-3.5-1.5-3.5-3.5 0-2 1-3.5 1-3.5-2.5-.5-3.5-3-3.5-4.5 0-2 1.5-4 3.5-4 .5-3.5 3-6.5 7-6.5 1.5 0 3 .5 3.5 1M14 14c0-2.5 1.5-4 3-4M14.5 16.5c-1 1-1.5 2.5-1.5 4M11.5 22c-.5 1.5-1 3 0 4.5" fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    'B': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
      </g>
      <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    'R': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#ffffff" fill-rule="evenodd" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/>
        <path d="M34 14l-3 3H14l-3-3"/>
        <path d="M31 17v12.5H14V17"/>
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
        <path d="M11 14h23" fill="none" stroke-linejoin="miter"/>
      </g>
    </svg>`,
    'Q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#ffffff" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"/>
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/>
        <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/>
      </g>
    </svg>`,
    'K': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fill-rule="evenodd" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/>
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#ffffff" stroke-linecap="butt" stroke-linejoin="miter"/>
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#ffffff"/>
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
      </g>
    </svg>`,

    // Black pieces
    'p': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000000" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    'n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.84 4.34-5 4.5-2.66.2-3.5-1.5-3.5-3.5 0-2 1-3.5 1-3.5-2.5-.5-3.5-3-3.5-4.5 0-2 1.5-4 3.5-4 .5-3.5 3-6.5 7-6.5 1.5 0 3 .5 3.5 1M14 14c0-2.5 1.5-4 3-4M14.5 16.5c-1 1-1.5 2.5-1.5 4M11.5 22c-.5 1.5-1 3 0 4.5" fill="#000000" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    'b': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#000000" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
      </g>
      <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    'r': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#000000" fill-rule="evenodd" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/>
        <path d="M34 14l-3 3H14l-3-3"/>
        <path d="M31 17v12.5H14V17"/>
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
        <path d="M11 14h23" fill="none" stroke-linejoin="miter"/>
      </g>
    </svg>`,
    'q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#000000" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"/>
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/>
        <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/>
      </g>
    </svg>`,
    'k': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="none" fill-rule="evenodd" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/>
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000000" stroke-linecap="butt" stroke-linejoin="miter"/>
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#000000"/>
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
      </g>
    </svg>`
  },

  // 2. MERIDA (Distinctive curved knight neck, rounded modern contours, stylish lines)
  merida: {
    'P': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path d="M22.5 6a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM20 15c-3 1.5-6 6.5-6 13h17c0-6.5-3-11.5-6-13h-5zM12 36c0-2 2-3 4-3h13c2 0 4 1 4 3H12zm-1 3v2h23v-2H11z" fill="#fcfcfc" stroke="#111111" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`,
    'N': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fcfcfc" stroke="#111111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 38h20c1 0 2-1 2-2 0-3-2-8-4-12 3-2 4-6 3-10-.5-2-3-4-5-4-2 0-3 1-3 2-1-2-4-3-6-2-4 2-5 8-5 13-2 1-4 4-4 7 0 5 4 8 7 8z"/>
        <circle cx="17" cy="16" r="1.5" fill="#111111" stroke="none"/>
        <path d="M12 25c2-1 5 0 7 2m-8 4c3-1 6 0 8 1" fill="none"/>
        <path d="M11 39v2h24v-2H11z"/>
      </g>
    </svg>`,
    'B': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fcfcfc" stroke="#111111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22.5" cy="7.5" r="2.5"/>
        <path d="M16 35c-2-3-3-9 0-14 2-3 5-7 6.5-10 1.5 3 4.5 7 6.5 10 3 5 2 11 0 14H16z"/>
        <path d="M19 18l7 7M26 18l-7 7" fill="none" stroke-width="1.4"/>
        <path d="M13 36c0-1.5 2-2.5 4-2.5h11c2 0 4 1 4 2.5H13zm-2 3v2h23v-2H11z"/>
      </g>
    </svg>`,
    'R': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fcfcfc" stroke="#111111" stroke-width="1.6" stroke-linejoin="round">
        <path d="M12 11h4v4h5v-4h4v4h5v-4h4v7h-22v-7zm2 7l1 14h15l1-14H14z"/>
        <path d="M12 33h21v3H12v-3zm-1 4v3h23v-3H11z"/>
      </g>
    </svg>`,
    'Q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fcfcfc" stroke="#111111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="7" cy="14" r="2"/><circle cx="15" cy="10" r="2"/><circle cx="22.5" cy="8" r="2"/><circle cx="30" cy="10" r="2"/><circle cx="38" cy="14" r="2"/>
        <path d="M8.5 15.5L13 30h19l4.5-14.5-7 9-7-14-7 14-7-9z"/>
        <path d="M11 31c-1 2 1 3 3 3h17c2 0 4-1 3-3H11zm-1 4c0 1 1 2 3 2h19c2 0 3-1 3-2H10zm0 3v2h25v-2H10z"/>
      </g>
    </svg>`,
    'K': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#fcfcfc" stroke="#111111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.5 4v7m-3.5-3.5h7" fill="none" stroke-width="1.8"/>
        <path d="M15 14c-4 3-5 9-2 14 2 3 6 4 9.5 4s7.5-1 9.5-4c3-5 2-11-2-14-3 1-5 2-7.5 2s-4.5-1-7.5-2z"/>
        <circle cx="22.5" cy="21" r="3" fill="#111111" stroke="none"/>
        <path d="M13 33c-1 1.5 1 3 3 3h13c2 0 4-1.5 3-3H13zm-2 4v2h23v-2H11zm-1 3v2h25v-2H10z"/>
      </g>
    </svg>`,

    // Black pieces
    'p': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <path d="M22.5 6a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM20 15c-3 1.5-6 6.5-6 13h17c0-6.5-3-11.5-6-13h-5zM12 36c0-2 2-3 4-3h13c2 0 4 1 4 3H12zm-1 3v2h23v-2H11z" fill="#222222" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>`,
    'n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#222222" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 38h20c1 0 2-1 2-2 0-3-2-8-4-12 3-2 4-6 3-10-.5-2-3-4-5-4-2 0-3 1-3 2-1-2-4-3-6-2-4 2-5 8-5 13-2 1-4 4-4 7 0 5 4 8 7 8z"/>
        <circle cx="17" cy="16" r="1.5" fill="#ffffff" stroke="none"/>
        <path d="M12 25c2-1 5 0 7 2m-8 4c3-1 6 0 8 1" fill="none"/>
        <path d="M11 39v2h24v-2H11z"/>
      </g>
    </svg>`,
    'b': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#222222" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22.5" cy="7.5" r="2.5"/>
        <path d="M16 35c-2-3-3-9 0-14 2-3 5-7 6.5-10 1.5 3 4.5 7 6.5 10 3 5 2 11 0 14H16z"/>
        <path d="M19 18l7 7M26 18l-7 7" fill="none" stroke="#ffffff" stroke-width="1.4"/>
        <path d="M13 36c0-1.5 2-2.5 4-2.5h11c2 0 4 1 4 2.5H13zm-2 3v2h23v-2H11z"/>
      </g>
    </svg>`,
    'r': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#222222" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round">
        <path d="M12 11h4v4h5v-4h4v4h5v-4h4v7h-22v-7zm2 7l1 14h15l1-14H14z"/>
        <path d="M12 33h21v3H12v-3zm-1 4v3h23v-3H11z"/>
      </g>
    </svg>`,
    'q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#222222" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="7" cy="14" r="2"/><circle cx="15" cy="10" r="2"/><circle cx="22.5" cy="8" r="2"/><circle cx="30" cy="10" r="2"/><circle cx="38" cy="14" r="2"/>
        <path d="M8.5 15.5L13 30h19l4.5-14.5-7 9-7-14-7 14-7-9z"/>
        <path d="M11 31c-1 2 1 3 3 3h17c2 0 4-1 3-3H11zm-1 4c0 1 1 2 3 2h19c2 0 3-1 3-2H10zm0 3v2h25v-2H10z"/>
      </g>
    </svg>`,
    'k': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#222222" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.5 4v7m-3.5-3.5h7" fill="none" stroke="#ffffff" stroke-width="1.8"/>
        <path d="M15 14c-4 3-5 9-2 14 2 3 6 4 9.5 4s7.5-1 9.5-4c3-5 2-11-2-14-3 1-5 2-7.5 2s-4.5-1-7.5-2z"/>
        <circle cx="22.5" cy="21" r="3" fill="#ffffff" stroke="none"/>
        <path d="M13 33c-1 1.5 1 3 3 3h13c2 0 4-1.5 3-3H13zm-2 4v2h23v-2H11zm-1 3v2h25v-2H10z"/>
      </g>
    </svg>`
  },

  // 3. CLASSIC (Traditional Staunton with bold geometric shapes & woodcut details)
  classic: {
    'P': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="22.5" cy="11.5" r="5.5" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>
      <path d="M17.5 18c-3 3-4 8-4 15h18c0-7-1-12-4-15h-10z" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>
      <path d="M11 36h23v4H11z" fill="#ffffff" stroke="#000000" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`,
    'N': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#ffffff" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 37h20c1 0 2-1 2-2 0-8-5-14-5-17 0-4 1-6 2-8-3 0-7 2-10 6-3 4-7 4-10 6-2 1-3 3-3 6 0 4 3 6 7 6l4-2c-1 3-1 5 1 7z"/>
        <circle cx="18" cy="18" r="1.5" fill="#000000" stroke="none"/>
        <path d="M10 37h26v3H10z"/>
      </g>
    </svg>`,
    'B': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#ffffff" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22.5" cy="7" r="2.5"/>
        <path d="M15 34c-2-4-3-11 0-16 2-3 4.5-6 7.5-8 3 2 5.5 5 7.5 8 3 5 2 12 0 16H15z"/>
        <path d="M22.5 14v12M17.5 19h10" fill="none" stroke-width="1.8"/>
        <path d="M11 36h23v4H11z"/>
      </g>
    </svg>`,
    'R': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#ffffff" stroke="#000000" stroke-width="1.8" stroke-linejoin="round">
        <path d="M11 10h5v4h4v-4h5v-4h4v4h5v-4h5v7h-28v-7zm3 7h22l-2 17H16l-2-17z"/>
        <path d="M10 36h25v4H10z"/>
      </g>
    </svg>`,
    'Q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#ffffff" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="13" r="2.5"/><circle cx="22.5" cy="8" r="2.5"/><circle cx="36" cy="13" r="2.5"/>
        <path d="M10 16l4 17h17l4-17-7 8-5.5-13-5.5 13-7-8z"/>
        <path d="M10 35h25v4H10z"/>
      </g>
    </svg>`,
    'K': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#ffffff" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.5 4v8M18.5 8h8" fill="none" stroke-width="2"/>
        <path d="M14 15c-3 3-4 9-2 14 2 3 5.5 4 10.5 4s8.5-1 10.5-4c2-5 1-11-2-14-3 2-6 3-8.5 3s-5.5-1-8.5-3z"/>
        <path d="M10 35h25v4H10z"/>
      </g>
    </svg>`,

    // Black pieces
    'p': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <circle cx="22.5" cy="11.5" r="5.5" fill="#1e293b" stroke="#000000" stroke-width="1.8"/>
      <path d="M17.5 18c-3 3-4 8-4 15h18c0-7-1-12-4-15h-10z" fill="#1e293b" stroke="#000000" stroke-width="1.8"/>
      <path d="M11 36h23v4H11z" fill="#1e293b" stroke="#000000" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`,
    'n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#1e293b" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 37h20c1 0 2-1 2-2 0-8-5-14-5-17 0-4 1-6 2-8-3 0-7 2-10 6-3 4-7 4-10 6-2 1-3 3-3 6 0 4 3 6 7 6l4-2c-1 3-1 5 1 7z"/>
        <circle cx="18" cy="18" r="1.5" fill="#ffffff" stroke="none"/>
        <path d="M10 37h26v3H10z"/>
      </g>
    </svg>`,
    'b': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#1e293b" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22.5" cy="7" r="2.5"/>
        <path d="M15 34c-2-4-3-11 0-16 2-3 4.5-6 7.5-8 3 2 5.5 5 7.5 8 3 5 2 12 0 16H15z"/>
        <path d="M22.5 14v12M17.5 19h10" fill="none" stroke="#ffffff" stroke-width="1.8"/>
        <path d="M11 36h23v4H11z"/>
      </g>
    </svg>`,
    'r': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#1e293b" stroke="#000000" stroke-width="1.8" stroke-linejoin="round">
        <path d="M11 10h5v4h4v-4h5v-4h4v4h5v-4h5v7h-28v-7zm3 7h22l-2 17H16l-2-17z"/>
        <path d="M10 36h25v4H10z"/>
      </g>
    </svg>`,
    'q': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#1e293b" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="13" r="2.5"/><circle cx="22.5" cy="8" r="2.5"/><circle cx="36" cy="13" r="2.5"/>
        <path d="M10 16l4 17h17l4-17-7 8-5.5-13-5.5 13-7-8z"/>
        <path d="M10 35h25v4H10z"/>
      </g>
    </svg>`,
    'k': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
      <g fill="#1e293b" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.5 4v8M18.5 8h8" fill="none" stroke="#ffffff" stroke-width="2"/>
        <path d="M14 15c-3 3-4 9-2 14 2 3 5.5 4 10.5 4s8.5-1 10.5-4c2-5 1-11-2-14-3 2-6 3-8.5 3s-5.5-1-8.5-3z"/>
        <path d="M10 35h25v4H10z"/>
      </g>
    </svg>`
  }
};

// Helper to look up piece SVG for current or specified style
function getPieceSvg(key, style) {
  const current = style || (typeof state !== 'undefined' && state.pieceStyle) || 'alpha';
  const set = PIECE_SETS[current] || PIECE_SETS['alpha'];
  return (set && set[key]) || (PIECE_SETS['alpha'] && PIECE_SETS['alpha'][key]) || '';
}

// Backward-compatibility default export
const PIECE_SVG = PIECE_SETS.alpha;

if (typeof window !== 'undefined') {
  window.PIECE_SETS = PIECE_SETS;
  window.PIECE_SVG = PIECE_SVG;
  window.getPieceSvg = getPieceSvg;
}

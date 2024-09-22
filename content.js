// content.js

// Function to convert a Unicode fraction to decimal
function unicodeFractionToDecimal(unicodeFraction) {
    const fractionMap = {
        '¼': 1 / 4,
        '½': 1 / 2,
        '¾': 3 / 4,
        '⅐': 1 / 7,
        '⅑': 1 / 9,
        '⅒': 1 / 10,
        '⅓': 1 / 3,
        '⅔': 2 / 3,
        '⅕': 1 / 5,
        '⅖': 2 / 5,
        '⅗': 3 / 5,
        '⅘': 4 / 5,
        '⅙': 1 / 6,
        '⅚': 5 / 6,
        '⅛': 1 / 8,
        '⅜': 3 / 8,
        '⅝': 5 / 8,
        '⅞': 7 / 8
    };
    return fractionMap[unicodeFraction] || 0;
}

// Function to convert a fractional inch string to decimal inches
function fractionalToDecimal(fractionStr) {
    // Match patterns like '31 1/8' or '5½'
    const mixedFractionRegex = /^(\d+)\s+(\d+)\/(\d+)$|^(\d+)([\u00BC-\u00BE\u2150-\u215E])$/;
    const match = fractionStr.match(mixedFractionRegex);
    if (match) {
        if (match[1] && match[2] && match[3]) {
            // Pattern: '31 1/8'
            const whole = parseInt(match[1], 10);
            const numerator = parseInt(match[2], 10);
            const denominator = parseInt(match[3], 10);
            if (denominator === 0) return whole; // Avoid division by zero
            return whole + numerator / denominator;
        } else if (match[4] && match[5]) {
            // Pattern: '5½'
            const whole = parseInt(match[4], 10);
            const fraction = unicodeFractionToDecimal(match[5]);
            return whole + fraction;
        }
    }

    // If no fraction, try to parse as integer or float
    const num = parseFloat(fractionStr);
    return isNaN(num) ? null : num;
}

// Function to convert inches to centimeters, rounded to two decimal places
function inchesToCm(inches) {
    return (inches * 2.54).toFixed(2);
}

// Function to process and convert dimensions in a given text
function convertDimensions(text) {
    // Regular expression to match dimension patterns
    // Positive lookahead ensures dimensions are followed by a space and a quote or end of string
    const dimensionRegex = /(\d+\s+\d+\/\d+|\d+[\u00BC-\u00BE\u2150-\u215E]|\d+\.\d+|\d+)\s*[xX]\s*(\d+\s+\d+\/\d+|\d+[\u00BC-\u00BE\u2150-\u215E]|\d+\.\d+|\d+)(?:\s*[xX]\s*(\d+\s+\d+\/\d+|\d+[\u00BC-\u00BE\u2150-\u215E]|\d+\.\d+|\d+))?(?=\s*"|$)/g;

    return text.replace(dimensionRegex, (match, dim1, dim2, dim3) => {
        // Collect all dimension parts
        const dimensions = [dim1, dim2];
        if (dim3) dimensions.push(dim3);

        // Convert each dimension to decimal inches
        const decimalInches = dimensions.map(dim => fractionalToDecimal(dim));

        if (decimalInches.includes(null)) {
            // If any conversion failed, log a warning and return the original match
            console.warn(`Failed to convert dimensions: ${match}`);
            return match;
        }

        // Convert each dimension to centimeters
        const cmDimensions = decimalInches.map(inch => inchesToCm(inch));

        // Join the cm dimensions with 'x' and add ' cm' at the end
        const cmString = cmDimensions.join('x') + ' cm';

        // Join the original dimensions with 'x' for the tooltip
        const originalDimensionsStr = dimensions.join('x');

        // Return the cm string with the original in the title attribute
        return `<span class="metric-converted" title="${originalDimensionsStr}">${cmString}</span>`;
    });
}

// Function to create the 3D render container
function createRenderContainer() {
    const container = document.createElement('div');
    container.className = 'metric-render-container';
    document.body.appendChild(container);
    return container;
}

// Function to remove the 3D render container
function removeRenderContainer(container) {
    if (container && container.parentNode) {
        container.parentNode.removeChild(container);
    }
}

// Function to initialize Three.js and render the box
function renderBox(container, width, height, depth) {
    // Set up the scene
    const scene = new THREE.Scene();

    // Set up the camera
    const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = Math.max(width, height, depth) * 2; // Position the camera based on box size

    // Set up the renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Create the box geometry
    const geometry = new THREE.BoxGeometry(width, height, depth);

    // Create a material
    const material = new THREE.MeshPhongMaterial({ color: 0x007bff, opacity: 0.6, transparent: true });

    // Create the mesh
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Render loop
    function animate() {
        requestAnimationFrame(animate);

        // Rotate the cube for better visualization
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
}

// Function to handle hover events
function handleHover(event) {
    const target = event.currentTarget;
    const dimensions = target.textContent.split('x').map(dim => parseFloat(dim));

    // Determine if it's 2D or 3D
    let [width, height, depth] = dimensions;
    if (dimensions.length === 2) {
        depth = 1; // Default depth for 2D objects
    } else if (dimensions.length !== 3) {
        console.warn(`Unsupported number of dimensions for 3D render: ${target.textContent}`);
        return;
    }

    // Create the render container
    const renderContainer = createRenderContainer();

    // Position the container near the hovered element
    const rect = target.getBoundingClientRect();
    renderContainer.style.top = `${rect.top + window.scrollY + rect.height + 10}px`; // 10px below
    renderContainer.style.left = `${rect.left + window.scrollX}px`;

    // Render the box
    renderBox(renderContainer, width, height, depth);

    // Add 'visible' class to fade in the container
    renderContainer.classList.add('visible');
}

// Function to handle mouseout events
function handleMouseOut(event) {
    const target = event.currentTarget;
    const container = document.querySelector('.metric-render-container');
    removeRenderContainer(container);
}

// Function to process a single element
function processElement(element) {
    // Avoid re-processing already converted elements
    if (element.dataset.metricConverted === "true") return;

    const originalHTML = element.innerHTML;
    const convertedHTML = convertDimensions(originalHTML);

    if (convertedHTML !== originalHTML) {
        element.innerHTML = convertedHTML;
        element.dataset.metricConverted = 'true';

        // Attach hover event listeners to the newly created .metric-converted spans
        const convertedSpans = element.querySelectorAll('.metric-converted');
        convertedSpans.forEach(span => {
            span.addEventListener('mouseenter', handleHover);
            span.addEventListener('mouseleave', handleMouseOut);
        });
    }
}

// Debounce function to limit the rate of function execution
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Function to process all target elements on the page
function processAllElements() {
    // Select all elements with the target class
    const elements = document.querySelectorAll('.plp-price-module__description');

    elements.forEach(element => {
        processElement(element);
    });
}

// Initial processing once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    processAllElements();
});

// Observe changes in the DOM to handle dynamically loaded content with debounce
const observer = new MutationObserver(debounce((mutations) => {
    processAllElements();
}, 300));

// Start observing the body for changes in child elements and subtree
observer.observe(document.body, { childList: true, subtree: true });

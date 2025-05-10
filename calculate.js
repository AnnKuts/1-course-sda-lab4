document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
});

    //console print
function printMatrix(matrix, title) {
    console.log(`\n${title}:`);
    matrix.forEach(row => console.log(row.join(" ")));
}

const w = canvas.width;
const h = canvas.height;
const RAD = 20;
const centerX = w / 2;
const centerY = h / 2;
const radius = 280;

const positions = Array.from({length: n}, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
    };
});

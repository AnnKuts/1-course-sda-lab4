document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    const seed = 4111;
    const n3 = 1;
    const n4 = 1;
    const n = 10 + n3;
    const k1 = 1.0 - n3 * 0.01 - n4 * 0.01 - 0.3; // 0.68
    const k2 = 1.0 - n3 * 0.005 - n4 * 0.005 - 0.27; // 0.72

    function removeBidirectionalEdges(matrix) {
        const n = matrix.length;
        const copy = matrix.map(row => row.slice());

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (copy[i][j] && copy[j][i]) {
                    copy[j][i] = 0;
                }
            }
        }
        return copy;
    }

    function genDirMatrix(selectedK) {
        return Array.from({length: n}, (_, i) =>
            Array.from({length: n}, (_, j) =>
                Math.floor(selectedK * ((i + 1) + (j + 1))) % 2
            )
        );
    }

    function genUndirMatrix(dir) {
        const undir = Array.from({length: n}, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dir[i][j] || dir[j][i]) undir[i][j] = undir[j][i] = 1;
            }
        }
        return undir;
    }

    function printMatrix(matrix, title) {
        console.log(`\n${title}:`);
        for (let i = 0; i < matrix.length; i++) {
            console.log(matrix[i].map(v => String(v).padStart(2, ' ')).join(" "));
        }
    }

    const w = canvas.width;
    const h = canvas.height;
    const RAD = 20;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = 280;

    function generatePositions(count) {
        return Array.from({length: count}, (_, i) => {
            const angle = (2 * Math.PI * i) / count - Math.PI / 2;
            return {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });
    }

    const positions = generatePositions(n);

    function distanceToLine(p1, p2, p) {
        const A = p.x - p1.x, B = p.y - p1.y;
        const C = p2.x - p1.x, D = p2.y - p1.y;
        const dot = A * C + B * D, len2 = C * C + D * D;
        const param = dot / len2;
        let xx, yy;
        if (param < 0) {
            xx = p1.x;
            yy = p1.y;
        } else if (param > 1) {
            xx = p2.x;
            yy = p2.y;
        } else {
            xx = p1.x + param * C;
            yy = p1.y + param * D;
        }
        const dx = p.x - xx, dy = p.y - yy;
        return Math.hypot(dx, dy);
    }

    function drawArrow(p1, p2, cp = null, labelSize = 0) {
        let angle;
        const nodeRadius = RAD + labelSize;

        if (cp) {
            const t = 0.95;
            const x = (1 - t) ** 2 * p1.x + 2 * (1 - t) * t * cp.x + t ** 2 * p2.x;
            const y = (1 - t) ** 2 * p1.y + 2 * (1 - t) * t * cp.y + t ** 2 * p2.y;

            const dx = 2 * (1 - t) * (cp.x - p1.x) + 2 * t * (p2.x - cp.x);
            const dy = 2 * (1 - t) * (cp.y - p1.y) + 2 * t * (p2.y - cp.y);
            angle = Math.atan2(dy, dx);

            const vx = x - p2.x;
            const vy = y - p2.y;
            const dist = Math.sqrt(vx * vx + vy * vy);

            const nvx = vx / dist;
            const nvy = vy / dist;

            const arrowX = p2.x + nvx * nodeRadius;
            const arrowY = p2.y + nvy * nodeRadius;

            p2 = {x: arrowX, y: arrowY};
        } else {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            angle = Math.atan2(dy, dx);

            p2 = {
                x: p2.x - nodeRadius * Math.cos(angle),
                y: p2.y - nodeRadius * Math.sin(angle)
            };
        }

        const arrowSize = 10;
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(
            p2.x - arrowSize * Math.cos(angle - Math.PI / 8),
            p2.y - arrowSize * Math.sin(angle - Math.PI / 8)
        );
        ctx.lineTo(
            p2.x - arrowSize * Math.cos(angle + Math.PI / 8),
            p2.y - arrowSize * Math.sin(angle + Math.PI / 8)
        );
        ctx.closePath();
        ctx.fill();
    }

    function drawSelfLoop(nodeX, nodeY, directed, idx) {
        let arcScale = 1.0;
        let extraOffset = 0;
        let forceInvert = false;
        let angularSpan = 3;

        if (idx === 0 || idx === 9 || idx === 7) {
            arcScale = 1;
            extraOffset = 0;
        }
        if (idx === 6) {
            forceInvert = true;
        }

        const arcR = RAD * 0.75 * arcScale;
        const offset = RAD + 10 + extraOffset;

        const dx = nodeX - centerX;
        const dy = nodeY - centerY;
        let theta = Math.atan2(dy, dx) * 180 / Math.PI;
        if (theta < 0) theta += 360;

        let cx, cy, start, end, ccw;
        if (theta >= 315 || theta < 45) {
            cx = nodeX + offset;
            cy = nodeY;
            start = -135 * angularSpan * Math.PI / 180;
            end = 135 * angularSpan * Math.PI / 180;
            ccw = false;
        } else if (theta >= 45 && theta < 135) {
            cx = nodeX;
            cy = nodeY + offset;
            start = -135 * angularSpan * Math.PI / 180;
            end = 45 * angularSpan * Math.PI / 180;
            ccw = false;
        } else if (theta >= 135 && theta < 225) {
            cx = nodeX - offset;
            cy = nodeY;
            start = 45 * angularSpan * Math.PI / 180;
            end = 225 * angularSpan * Math.PI / 180;
            ccw = true;
        } else {
            cx = nodeX;
            cy = nodeY - offset;
            start = 135 * angularSpan * Math.PI / 180;
            end = 315 * angularSpan * Math.PI / 180;
            ccw = true;
        }

        if (forceInvert) ccw = !ccw;

        ctx.beginPath();
        ctx.arc(cx, cy, arcR, ccw ? end : start, ccw ? start : end, ccw);
        ctx.stroke();

        if (!directed) return;

        if (idx === 3 || idx === 4) { // Vertex 4
            const arrowPositionFactor = ccw ? 0.25 : 0.77;
            const arrowAngle = ccw ?
                start + arrowPositionFactor * (end - start) :
                start + arrowPositionFactor * (end - start);

            const ax = cx + arcR * Math.cos(arrowAngle);
            const ay = cy + arcR * Math.sin(arrowAngle);

            const radialDir = Math.atan2(ay - cy, ax - cx);
            const rotationAdjustment = Math.PI / 9; // 20 degrees rotation
            const tangentDir = radialDir + Math.PI / 2 * (ccw ? -1 : 1) + rotationAdjustment;

            const L = 0.55 * RAD * 0.75;

            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(
                ax + L * Math.cos(tangentDir - Math.PI / 6),
                ay + L * Math.sin(tangentDir - Math.PI / 6)
            );
            ctx.lineTo(
                ax + L * Math.cos(tangentDir + Math.PI / 6),
                ay + L * Math.sin(tangentDir + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        } else if (idx === 7) { // Вершина 8
            const arrowAngle = start + (end - start) * 0.5;
            const ax = cx + arcR * Math.cos(arrowAngle);
            const ay = cy + arcR * Math.sin(arrowAngle);
            const tangentDir = arrowAngle + (ccw ? -1 : 1) * Math.PI / 2.2;

            const L = 0.55 * RAD * 0.75;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(
                ax - L * Math.cos(tangentDir - Math.PI / 6),
                ay - L * Math.sin(tangentDir - Math.PI / 6)
            );
            ctx.lineTo(
                ax - L * Math.cos(tangentDir + Math.PI / 6),
                ay - L * Math.sin(tangentDir + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        } else if (idx === 9) {
            const factor = 1;
            const arrowAngle = ccw ?
                start + factor * (end - start) :
                start + (1 - factor) * (end - start);

            const ax = cx + arcR * Math.cos(arrowAngle);
            const ay = cy + arcR * Math.sin(arrowAngle);

            const arrowDir = Math.atan2(nodeY - ay, nodeX - ax);
            const L = 0.55 * RAD * 0.75;

            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(
                ax - L * Math.cos(arrowDir - Math.PI / 6),
                ay - L * Math.sin(arrowDir - Math.PI / 6)
            );
            ctx.lineTo(
                ax - L * Math.cos(arrowDir + Math.PI / 6),
                ay - L * Math.sin(arrowDir + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        } else {
            const arrowAngle = ccw ? start : end;
            const ax = cx + arcR * Math.cos(arrowAngle);
            const ay = cy + arcR * Math.sin(arrowAngle);

            const arrowDir = Math.atan2(nodeY - ay, nodeX - ax);
            const L = 0.55 * RAD * 0.75;

            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(
                ax - L * Math.cos(arrowDir - Math.PI / 6),
                ay - L * Math.sin(arrowDir - Math.PI / 6)
            );
            ctx.lineTo(
                ax - L * Math.cos(arrowDir + Math.PI / 6),
                ay - L * Math.sin(arrowDir + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawGraph(matrix, directed, nodeLabels = null) {
        const unidirectionalMatrix = directed ? removeBidirectionalEdges(matrix) : matrix;

        const nodeCount = unidirectionalMatrix.length;
        const nodePos = generatePositions(nodeCount);
        const labelSizeAdjustment = nodeLabels ? 10 : 0;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = "#333";
        ctx.fillStyle = "#000";
        for (let i = 0; i < nodeCount; i++) {
            for (let j = 0; j < nodeCount; j++) {
                // Перевірка наявності ребра з урахуванням петель
                if (!unidirectionalMatrix[i][j]) continue;
                if (!directed && j < i) continue;

                if (i === j) {
                    drawSelfLoop(nodePos[i].x, nodePos[i].y, directed, i);
                    continue;
                }
                const p1 = nodePos[i], p2 = nodePos[j];
                let curved = false, cp = null;
                for (let k2 = 0; k2 < nodeCount; k2++) {
                    if (k2 === i || k2 === j) continue;
                    if (distanceToLine(p1, p2, nodePos[k2]) < 25) {
                        curved = true;
                        const mid = {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2};
                        const perp = {x: -(p2.y - p1.y), y: p2.x - p1.x};
                        const len = Math.hypot(perp.x, perp.y);
                        const dirSign = i < j ? 1 : -1;
                        cp = {
                            x: mid.x + dirSign * (perp.x / len) * 90,
                            y: mid.y + dirSign * (perp.y / len) * 90
                        };
                        break;
                    }
                }

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                if (curved) ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
                else ctx.lineTo(p2.x, p2.y);
                ctx.stroke();

                if (directed) {
                    drawArrow(p1, p2, curved ? cp : null, nodeLabels ? nodeLabels[j].length * 3 : 0);
                }
            }
        }
        for (let i = 0; i < nodeCount; i++) {
            const nodeR = nodeLabels ? Math.max(RAD, RAD + nodeLabels[i].length * 3) : RAD;

            ctx.beginPath();
            ctx.fillStyle = "#fff";
            ctx.arc(nodePos[i].x, nodePos[i].y, nodeR, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#000";
            ctx.font = "14px Times New Roman";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const label = nodeLabels ? nodeLabels[i] : (i + 1);
            ctx.fillText(label, nodePos[i].x, nodePos[i].y);
        }
    }

    function condensationMatrix(adj, components) {
        const m = components.length;
        const C = Array.from({length: m}, () => Array(m).fill(0));
        const nodeToComp = {};

        components.forEach((comp, ci) =>
            comp.forEach(v1 => {
                nodeToComp[v1 - 1] = ci;
            })
        );

        for (let u = 0; u < adj.length; u++) {
            for (let v = 0; v < adj.length; v++) {
                if (adj[u][v] === 1) {
                    const cu = nodeToComp[u], cv = nodeToComp[v];
                    if (cu !== cv) C[cu][cv] = 1;
                }
            }
        }
        return C;
    }

    function drawCondensedGraph(matrix, components) {
        const condensedMatrix = condensationMatrix(matrix, components);
        const compLabels = components.map((_, idx) => `C${idx + 1}`);
        drawGraph(condensedMatrix, true, compLabels);
    }

    function computeDegrees(dirMatrix, undirMatrix) {
        const n = dirMatrix.length;
        const outDeg = Array(n).fill(0);
        const inDeg = Array(n).fill(0);
        const dirDeg = Array(n).fill(0);
        const undirDeg = Array(n).fill(0);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dirMatrix[i][j]) outDeg[i]++;
                if (dirMatrix[j][i]) inDeg[i]++;
                if (undirMatrix[i][j]) undirDeg[i]++;
            }
            dirDeg[i] = outDeg[i] + inDeg[i];
        }

        return {outDeg, inDeg, dirDeg, undirDeg};
    }

    function matMul(A, B) {
        const n = A.length;
        const C = Array.from({length: n}, () => Array(n).fill(0));
        for (let i = 0; i < n; i++)
            for (let k = 0; k < n; k++) if (A[i][k])
                for (let j = 0; j < n; j++)
                    C[i][j] += A[i][k] * B[k][j];
        return C;
    }


    function isRegular(degrees) {
        return degrees.every(d => d === degrees[0]);
    }

    function findHangingAndIsolated(undirDeg) {
        const hanging = [];
        const isolated = [];
        undirDeg.forEach((d, idx) => {
            if (d === 0) isolated.push(idx + 1);
            else if (d === 1) hanging.push(idx + 1);
        });
        return {hanging, isolated};
    }

    function findPathsOfLength(A, K) {
        const n = A.length, paths = [];

        function dfs(path) {
            if (path.length === K + 1) {
                paths.push(path.map(v => v + 1));
                return;
            }
            const u = path[path.length - 1] - 1;
            for (let v = 0; v < n; v++) {
                if (A[u][v]) {
                    path.push(v + 1);
                    dfs(path);
                    path.pop();
                }
            }
        }

        for (let start = 1; start <= n; start++) dfs([start]);
        return paths;
    }

    function transitiveClosure(A) {
        const n = A.length;
        const R = A.map(row => [...row]);
        for (let i = 0; i < n; i++) {
            R[i][i] = 1;
        }

        for (let k = 0; k < n; k++) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (R[i][k] && R[k][j]) {
                        R[i][j] = 1;
                    }
                }
            }
        }
        return R;
    }

    function strongConnectivityMatrix(R) {
        const n = R.length;
        const S = Array.from({length: n}, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (R[i][j] && R[j][i]) S[i][j] = 1;
            }
        }
        return S;
    }

    function getStrongComponents(S) {
        const n = S.length;
        const visited = Array(n).fill(false);
        const comps = [];

        for (let i = 0; i < n; i++) {
            if (!visited[i]) {
                const comp = [i + 1];
                visited[i] = true;

                for (let j = 0; j < n; j++) {
                    if (j !== i && S[i][j] && !visited[j]) {
                        comp.push(j + 1);
                        visited[j] = true;
                    }
                }

                comps.push(comp);
            }
        }

        return comps;
    }

    function buildCondensationGraph(A, components) {
        const m = components.length;
        const C = Array.from({length: m}, () => Array(m).fill(0));
        const v2c = {};
        components.forEach((comp, i) =>
            comp.forEach(v => v2c[v - 1] = i)
        );

        for (let u = 0; u < A.length; u++) {
            for (let v = 0; v < A.length; v++) {
                if (A[u][v]) {
                    const cu = v2c[u], cv = v2c[v];
                    if (cu !== cv) C[cu][cv] = 1;
                }
            }
        }

        return C;
    }

    let selectedK = k1;
    let mode = "k1";

    function askForMode() {
        let answer;
        do {
            answer = prompt("k1 or k2?", "k1");
            if (answer === null) return "k1";
            answer = answer.trim().toLowerCase();
        } while (answer !== "k1" && answer !== "k2");
        return answer;
    }

    mode = askForMode();
    selectedK = (mode === "k2") ? k2 : k1;

    if (mode === "k2") {
        btnUndirected.style.display = "none";
        btnCondense.style.display = "inline-block";
    } else {
        btnUndirected.style.display = "inline-block";
        btnCondense.style.display = "none";
    }
    const dirMatrix = genDirMatrix(selectedK);
    const undirMatrix = genUndirMatrix(dirMatrix);

    document.getElementById("btnDirected").onclick = () => {
        console.clear();
        document.querySelector('.console-warning').classList.remove('visible');
        printMatrix(dirMatrix, `Directed matrix (Adir)`);
        drawGraph(dirMatrix, true);
    };

    document.getElementById("btnUndirected").onclick = () => {
        console.clear();
        document.querySelector('.console-warning').classList.remove('visible');
        printMatrix(undirMatrix, `Undirected matrix (Aundir)`);
        drawGraph(undirMatrix, false);
    };

    document.getElementById("btnCondense").onclick = () => {
        console.clear();
        document.querySelector('.console-warning').classList.remove('visible');
        const R = transitiveClosure(dirMatrix);
        const S = strongConnectivityMatrix(R);
        const components = getStrongComponents(S);
        console.log("\n5) Компоненти сильної зв'язності:");
        components.forEach((comp, index) => {
            console.log(`  C${index + 1} = { ${comp.join(", ")} }`);
        });

        printMatrix(S, "Матриця сильної зв'язності:");
        console.log("\nКонденсований граф:");
        const C = buildCondensationGraph(dirMatrix, components);
        printMatrix(C, "Матриця конденсації:");

        drawCondensedGraph(dirMatrix, components);
    };

    document.getElementById("btnCalculate").onclick = () => {
        console.clear();
        document.querySelector('.console-warning').classList.add('visible');
        if (mode === "k1") {
            console.log('=== Результати для k1 ===');
            const {outDeg, inDeg, dirDeg, undirDeg} = computeDegrees(dirMatrix, undirMatrix);
            printMatrix(dirMatrix, 'Directed matrix (Adir)');
            printMatrix(undirMatrix, 'Undirected matrix (Aundir)');

            console.log('\n1) Степені вершин:');
            dirDeg.forEach((d, i) => console.log(` вершина ${i + 1}: степінь = ${d}`));

            console.log('\n2) Напівстепені вершин:');
            inDeg.forEach((d, i) => console.log(` вершина ${i + 1}: вхід = ${d}, вихід = ${outDeg[i]}`));

            console.log(`\n3) Регулярний (Adir):`);
            console.log(`   ${isRegular(dirDeg) ? 'так' : 'ні'}${isRegular(dirDeg) ? ', d=' + dirDeg[0] : ''}`);
            console.log(`   Регулярний (Aundir):`);
            console.log(`   ${isRegular(undirDeg) ? 'так' : 'ні'}${isRegular(undirDeg) ? ', d=' + undirDeg[0] : ''}`);

            const {hanging, isolated} = findHangingAndIsolated(undirDeg);
            console.log("\n4) Висячі вершини:");
            if (hanging.length > 0) {
                hanging.forEach(v => console.log(`   - вершина ${v}`));
            } else {
                console.log("   немає");
            }

            console.log("   Ізольовані вершини:");
            if (isolated.length > 0) {
                isolated.forEach(v => console.log(`   - вершина ${v}`));
            } else {
                console.log("   немає");
            }


            drawGraph(dirMatrix, true);
        } else {
            console.log('=== Результати для k2 ===');
            printMatrix(dirMatrix, 'Directed matrix (Adir)');
            const {outDeg, inDeg, dirDeg, undirDeg} = computeDegrees(dirMatrix, undirMatrix);

            console.log('\n1) Напівстепені та степені:');
            inDeg.forEach((d, i) => console.log(` вершина ${i + 1}: вхід = ${d}, вихід = ${outDeg[i]}, сума = ${dirDeg[i]}`));

            const A2 = matMul(dirMatrix, dirMatrix);
            const A3 = matMul(A2, dirMatrix);

            console.log("\nШляхи довжини 2:");
            for (let i = 0; i < n; i++)
                for (let j = 0; j < n; j++)
                    if (A2[i][j] > 0)                // існує хоча б один шлях
                        for (let m = 0; m < n; m++)
                            if (dirMatrix[i][m] && dirMatrix[m][j])
                                console.log(`  ${i + 1} → ${m + 1} → ${j + 1}`);

            console.log("\nШляхи довжини 3:");
            for (let i = 0; i < n; i++)
                for (let j = 0; j < n; j++)
                    if (A3[i][j] > 0)
                        for (let m = 0; m < n; m++) if (dirMatrix[i][m])
                            for (let p = 0; p < n; p++)
                                if (dirMatrix[m][p] && dirMatrix[p][j])
                                    console.log(`  ${i + 1} → ${m + 1} → ${p + 1} → ${j + 1}`);


            const R = transitiveClosure(dirMatrix);
            printMatrix(R, '\n3) Матриця досяжності');

            const S = strongConnectivityMatrix(R);
            printMatrix(S, '\n4) Матриця сильної зв\'язності');

            const comps = getStrongComponents(S);
            console.log('\n5) Компоненти сильної зв\'язності:');
            comps.forEach((comp, index) => {
                console.log(`  C${index + 1} = { ${comp.join(", ")} }`);
            });

            const C = buildCondensationGraph(dirMatrix, comps);
            printMatrix(C, '\n6) Матриця конденсації');

            drawCondensedGraph(dirMatrix, comps);
        }
    };

    drawGraph(dirMatrix, true);
    console.log(`Граф ініціалізовано в режимі ${mode} (${mode} = ${selectedK.toFixed(2)})`);
});
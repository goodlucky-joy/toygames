// --- 1. 테마 데이터 설정 ---
const themes = {
    midnight: { bg: '#162447', peg: '#4ecca3', line: '#e94560', ballStroke: '#ffffff' },
    neon: { bg: '#000000', peg: '#ff00ff', line: '#00ffff', ballStroke: '#ffffff' },
    forest: { bg: '#1b4332', peg: '#d8f3dc', line: '#ffb703', ballStroke: '#ffffff' }
};
let currentTheme = themes.midnight;

// --- 2. 상태 변수 추가 ---
let isFirstOrder = true; // true: 먼저 도착, false: 늦게 도착

// --- 3. 공 클래스 수정 (공끼리 충돌 로직 추가) ---
class Ball {
    constructor(name, x, color) {
        this.name = name;
        this.x = x;
        this.y = 30;
        this.radius = 14;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = 2;
        this.gravity = 0.15;
        this.bounce = 0.6;
        this.isFinished = false;
    }

    update() {
        if (this.isFinished) return;

        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // 벽 충돌
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
            this.vx *= -this.bounce;
            this.x = this.x < this.radius ? this.radius : canvas.width - this.radius;
        }

        // 장애물(Peg) 충돌
        pegs.forEach(peg => {
            let dx = this.x - peg.x;
            let dy = this.y - peg.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < this.radius + peg.radius) {
                let angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 5 * this.bounce;
                this.vy = Math.sin(angle) * 5 * this.bounce;
            }
        });

        // [추가 기능 1] 공끼리 충돌 검사
        balls.forEach(other => {
            if (other === this || other.isFinished) return;
            let dx = this.x - other.x;
            let dy = this.y - other.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < this.radius * 2) {
                // 부딪혔을 때 서로 밀어내고 속도 교환 (단순화된 물리)
                let angle = Math.atan2(dy, dx);
                this.vx += Math.cos(angle) * 1.5;
                this.vy += Math.sin(angle) * 1.5;
                other.vx -= Math.cos(angle) * 1.5;
                other.vy -= Math.sin(angle) * 1.5;
            }
        });

        if (this.y + this.radius >= canvas.height - 5) {
            this.isFinished = true;
            this.y = canvas.height - 5 - this.radius;
            recordRank(this.name);
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = currentTheme.ballStroke;
        ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(this.name, this.x, this.y + 4);
    }
}

// --- 4. 순위 출력 로직 수정 [추가 기능 3] ---
function renderLeaderboard() {
    rankList.innerHTML = '';
    // 표시용 배열 복사
    let displayRank = [...rankings];
    // 토글 상태가 '늦게 도착 순'이면 배열 뒤집기
    if (!isFirstOrder) {
        displayRank.reverse();
    }

    displayRank.forEach((name, index) => {
        const li = document.createElement('li');
        // 순위 표시 방식 결정
        let rankNum = isFirstOrder ? index + 1 : rankings.length - index;
        li.textContent = `${rankNum}등: ${name}`;
        rankList.appendChild(li);
    });
}

function recordRank(name) {
    if (!rankings.includes(name)) {
        rankings.push(name);
        renderLeaderboard();
    }
}

// --- 5. 이벤트 리스너 및 애니메이션 수정 ---

// [추가 기능 2] 테마 변경 감지
document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentTheme = themes[e.target.value];
        // 배경 즉시 반영을 위해 리셋 버튼 효과
        if(!isPlaying) resetBtn.click();
    });
});

// [추가 기능 3] 정렬 토글 버튼
const orderToggle = document.getElementById('orderToggle');
orderToggle.addEventListener('click', () => {
    isFirstOrder = !isFirstOrder;
    orderToggle.textContent = isFirstOrder ? "먼저 도착 순" : "늦게 도착 순";
    renderLeaderboard();
});

function animate() {
    if (!isPlaying) return;
    
    // 현재 테마 배경색 적용
    ctx.fillStyle = currentTheme.bg;
    ctx.globalAlpha = 0.4; // 잔상 효과
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    // 장애물 그리기 (현재 테마 색상)
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = currentTheme.peg;
        ctx.fill();
        ctx.closePath();
    });

    // 도착선
    ctx.strokeStyle = currentTheme.line;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 5);
    ctx.lineTo(canvas.width, canvas.height - 5);
    ctx.stroke();

    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    requestAnimationFrame(animate);
}
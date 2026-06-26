const canvas = document.getElementById('pinballCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const rankList = document.getElementById('rankList');

// 게임 설정
let balls = [];
let pegs = [];
let rankings = [];
let isPlaying = false;

// 눈에 띄는 화려한 공 색상 목록
const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF0', '#FFA500', '#9A33FF'];

// 테마 데이터 설정 ---
const themes = {
    midnight: { bg: '#162447', peg: '#4ecca3', line: '#e94560', ballStroke: '#ffffff' },
    neon: { bg: '#000000', peg: '#ff00ff', line: '#00ffff', ballStroke: '#ffffff' },
    forest: { bg: '#1b4332', peg: '#d8f3dc', line: '#ffb703', ballStroke: '#ffffff' }
};
let currentTheme = themes.midnight;

// 순위 결정 변수 ---
let isFirstOrder = true; // true: 먼저 도착, false: 늦게 도착


// 1. 장애물(못/Peg) 배치 생성 (격자 형태)
function initPegs() {
    pegs = [];
    const rows = 7;
    const cols = 8;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // 지그재그 배치를 위해 홀수 줄은 약간 우측으로 이동
            let x = 50 + c * 55 + (r % 2 === 0 ? 0 : 25);
            let y = 120 + r * 55;
            // 화면 안에 들어오는 장애물만 저장
            if (x < canvas.width - 20) {
                pegs.push({ x: x, y: y, radius: 6 });
            }
        }
    }
}

// 2. 공(Ball) 클래스 정의 (객체 지향 구조)
class Ball {
    constructor(name, x, color) {
        this.name = name;
        this.x = x;
        this.y = 30; // 출발 높이
        this.radius = 14;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 2; // 초기 좌우 속도 무작위
        this.vy = 1;                         // 초기 하강 속도
        this.gravity = 0.15;                 // 중력 가속도
        this.bounce = 0.5;                   // 탄성 계수 (반사력)
        this.isFinished = false;
    }

    update() {
        if (this.isFinished) return;

        // 중력 적용 및 위치 이동
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // 벽면 충돌 처리 (좌우 벽)
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -this.bounce;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -this.bounce;
        }

        // 장애물(Peg)과의 충돌 검사 (피타고라스 정리 활용)
        pegs.forEach(peg => {
            let dx = this.x - peg.x;
            let dy = this.y - peg.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + peg.radius) {
                // 충돌 시 밀려나기 및 튕기기
                let angle = Math.atan2(dy, dx);
                this.x = peg.x + Math.cos(angle) * (this.radius + peg.radius);
                this.y = peg.y + Math.sin(angle) * (this.radius + peg.radius);
                
                // 속도 벡터 반사 및 무작위성 추가(더 역동적인 움직임)
                let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx = Math.cos(angle) * speed * this.bounce + (Math.random() - 0.5) * 1;
                this.vy = Math.sin(angle) * speed * this.bounce;
            }
        });

        // 공끼리 충돌 검사
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

        // 바닥 도착 판정
        if (this.y + this.radius >= canvas.height) {
            this.y = canvas.height - this.radius;
            this.isFinished = true;
            recordRank(this.name);
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.closePath();

        // 공 위에 이름 쓰기
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name.substring(0, 3), this.x, this.y + 4);
    }
}

// --- 3. 순위 출력 로직 ---
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

// 3. 순위 기록 함수
function recordRank(name) {
    if (!rankings.includes(name)) {
        rankings.push(name);
        renderLeaderboard();
        
        // 화면에 실시간 순위 반영
        const li = document.createElement('li');
        li.textContent = `${rankings.length}등: ${name}`;
        rankList.appendChild(li);
    }
}

// 테마 변경 감지
document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentTheme = themes[e.target.value];
        // 배경 즉시 반영을 위해 리셋 버튼 효과
        if(!isPlaying) resetBtn.click();
    });
});

// 정렬 토글 버튼
const orderToggle = document.getElementById('orderToggle');
orderToggle.addEventListener('click', () => {
    isFirstOrder = !isFirstOrder;
    orderToggle.textContent = isFirstOrder ? "먼저 도착 순" : "늦게 도착 순";
    renderLeaderboard();
});

// 4. 애니메이션 루프
function animate() {
    if (!isPlaying) return;
    
    // 잔상 효과를 주며 화면 지우기 (세련된 시각 효과)
    // ctx.fillStyle = 'rgba(22, 36, 71, 0.3)';
    ctx.fillStyle = currentTheme.bg;
    ctx.globalAlpha = 0.4; // 잔상 효과
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    // 장애물 그리기
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        // ctx.fillStyle = '#4ecca3';
        ctx.fillStyle = currentTheme.peg; // 현재 테마 색상
        ctx.fill();
        ctx.closePath();
    });

    // 바닥 안전선/도착점 표시
    // ctx.strokeStyle = '#e94560';
    ctx.strokeStyle = currentTheme.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 5);
    ctx.lineTo(canvas.width, canvas.height - 5);
    ctx.stroke();

    // 공 업데이트 및 그리기
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    requestAnimationFrame(animate);
}

// 5. 이벤트 리스너 (시작 및 초기화)
startBtn.addEventListener('click', () => {
    if (isPlaying) return;

    const names = nameInput.value.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) {
        alert('이름을 하나 이상 입력해주세요!');
        return;
    }

    rankings = [];
    rankList.innerHTML = '';
    balls = [];
    
    // 입력받은 이름만큼 공 생성 및 상단에 무작위 배치
    names.forEach((name, index) => {
        let startX = 50 + Math.random() * (canvas.width - 100);
        let color = colors[index % colors.length];
        balls.push(new Ball(name, startX, color));
    });

    isPlaying = true;
    animate();
});

resetBtn.addEventListener('click', () => {
    isPlaying = false;
    balls = [];
    rankings = [];
    rankList.innerHTML = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initPegs();
    // 초기 화면에 장애물만 먼저 그려두기
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4ecca3';
        ctx.fill();
        ctx.closePath();
    });
});

// 초기화 실행
initPegs();
resetBtn.click();

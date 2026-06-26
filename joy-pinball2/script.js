const canvas = document.getElementById('pinballCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const rankList = document.getElementById('rankList');
const orderToggle = document.getElementById('orderToggle');
const boardTitle = document.getElementById('boardTitle');

// 게임 데이터 상태 관리
let balls = [];
let pegs = [];
let rankings = [];
let isPlaying = false;
let isFirstOrder = true;

// 유니크하고 채도가 높은 비비드 공 색상 조합
const colors = ['#FF3366', '#33FF66', '#3366FF', '#FFFF33', '#FF33FF', '#33FFFF', '#FF9900', '#9933FF', '#00FF99', '#FF007F'];

// [버그 수정 & 연동] 테마 데이터 구조 고도화 (장애물과 라인에 글로우/네온 스타일 입히기 전용)
const themes = {
    midnight: { bg: '#162447', peg: '#4ecca3', line: '#e94560', ballStroke: '#ffffff', pegGlow: 'rgba(78, 204, 163, 0)' },
    neon: { bg: '#05050c', peg: '#ff00ff', line: '#00ffff', ballStroke: '#ffffff', pegGlow: '#ff00ff' },
    forest: { bg: '#112f22', peg: '#a3e635', line: '#f59e0b', ballStroke: '#ffffff', pegGlow: 'rgba(163, 230, 53, 0.3)' }
};
let currentTheme = themes.midnight;

// 1. 장애물 정밀 배치 레이아웃 함수
function initPegs() {
    pegs = [];
    const rows = 8;
    const cols = 8;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let x = 50 + c * 56 + (r % 2 === 0 ? 0 : 28);
            let y = 130 + r * 50;
            if (x < canvas.width - 25) {
                pegs.push({ x: x, y: y, radius: 6 });
            }
        }
    }
}

// 2. 물리 연산 처리 공 객체 모델링
class Ball {
    constructor(name, x, color) {
        this.name = name;
        this.x = x;
        this.y = 35;
        this.radius = 13;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = 1;
        this.gravity = 0.18;
        this.bounce = 0.55;
        this.isFinished = false;
    }

    update() {
        if (this.isFinished) return;

        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // 벽 충돌 제어
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -this.bounce;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -this.bounce;
        }

        // 못(Peg) 충돌 정밀 처리
        pegs.forEach(peg => {
            let dx = this.x - peg.x;
            let dy = this.y - peg.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + peg.radius) {
                let angle = Math.atan2(dy, dx);
                this.x = peg.x + Math.cos(angle) * (this.radius + peg.radius);
                this.y = peg.y + Math.sin(angle) * (this.radius + peg.radius);
                
                let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx = Math.cos(angle) * speed * this.bounce + (Math.random() - 0.5) * 1.5;
                this.vy = Math.sin(angle) * speed * this.bounce;
            }
        });

        // 공 간 충돌 처리
        balls.forEach(other => {
            if (other === this || other.isFinished) return;
            
            let dx = this.x - other.x;
            let dy = this.y - other.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius * 2) {
                let angle = Math.atan2(dy, dx);
                this.vx += Math.cos(angle) * 1.2;
                this.vy += Math.sin(angle) * 1.2;
                other.vx -= Math.cos(angle) * 1.2;
                other.vy -= Math.sin(angle) * 1.2;
            }
        });

        // 도착선 판정
        if (this.y + this.radius >= canvas.height - 8) {
            this.y = canvas.height - 8 - this.radius;
            this.isFinished = true;
            recordRank(this.name);
        }
    }

    draw() {
        ctx.save();
        // 공 입체감 드롭 섀도우 처리
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = currentTheme.ballStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        ctx.restore();

        // 공 위 이름 표시
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name.substring(0, 3), this.x, this.y + 4);
    }
}

// 3. 화면을 정적으로 다시 그리는 전용 함수 (테마 스위칭 시 장애물이 즉시 바뀌도록 설계)
function drawStaticScene() {
    // 배경 채우기
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 장애물 그리기 루프
    pegs.forEach(peg => {
        ctx.save();
        // 네온 모드 시 글로우 시각 효과 활성화
        if (currentTheme.pegGlow !== 'rgba(78, 204, 163, 0)') {
            ctx.shadowColor = currentTheme.pegGlow;
            ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = currentTheme.peg;
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    });

    // 빨간색 하단 킬 선(도착 스코어 바) 렌더링
    ctx.strokeStyle = currentTheme.line;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 8);
    ctx.lineTo(canvas.width, canvas.height - 8);
    ctx.stroke();
}

// 4. 순위 정렬 결과 출력 엔진
function renderLeaderboard() {
    rankList.innerHTML = '';
    let displayRank = [...rankings];
    
    if (!isFirstOrder) {
        displayRank.reverse();
    }

    displayRank.forEach((name, index) => {
        const li = document.createElement('li');
        let rankNum = isFirstOrder ? index + 1 : rankings.length - index;
        li.textContent = `${rankNum}등 : ${name}`;
        rankList.appendChild(li);
    });
}

function recordRank(name) {
    if (!rankings.includes(name)) {
        rankings.push(name);
        renderLeaderboard();
    }
}

// 5. 프레임 렌더링 루프
function animate() {
    if (!isPlaying) return;
    
    // 테마 배경을 약간의 투명도로 덮어 공 궤적 잔상 효과 구현
    ctx.fillStyle = currentTheme.bg;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0; 

    // 현재 선택 테마 색상으로 장애물 그리기
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = currentTheme.peg;
        ctx.fill();
        ctx.closePath();
    });

    // 현재 선택 테마의 골라인 스트로크
    ctx.strokeStyle = currentTheme.line;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 8);
    ctx.lineTo(canvas.width, canvas.height - 8);
    ctx.stroke();

    // 움직이는 실시간 객체 활성화
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    requestAnimationFrame(animate);
}

// 6. 이벤트 핸들러 바인딩 코드 

// [해결] 테마 변경 시 화면이 비어있거나 변화 없는 문제 완전 해결
document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentTheme = themes[e.target.value];
        // 캔버스 스타일 백그라운드 연동 동기화 추가
        canvas.style.backgroundColor = currentTheme.bg;
        if (!isPlaying) {
            drawStaticScene(); // 게임 중이 아닐 때 바뀐 색상 즉시 드로잉 호출
        }
    });
});

orderToggle.addEventListener('click', () => {
    isFirstOrder = !isFirstOrder;
    if (isFirstOrder) {
        orderToggle.textContent = "먼저 도착 순";
        boardTitle.textContent = "🏆 실시간 순위 (먼저 도착 순)";
    } else {
        orderToggle.textContent = "늦게 도착 순";
        boardTitle.textContent = "🏆 실시간 순위 (늦게 도착 순)";
    }
    renderLeaderboard();
});

startBtn.addEventListener('click', () => {
    if (isPlaying) return;

    const names = nameInput.value.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) {
        alert('이름을 작성해 주세요!');
        return;
    }

    rankings = [];
    rankList.innerHTML = '';
    balls = [];
    
    names.forEach((name, index) => {
        let startX = 60 + Math.random() * (canvas.width - 120);
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
    canvas.style.backgroundColor = currentTheme.bg;
    initPegs();
    drawStaticScene(); // 리셋 즉시 장애물 재생성 및 테마 동기화 드로잉
});

// 실행 초기화 엔진 구동
initPegs();
resetBtn.click();

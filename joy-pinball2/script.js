const canvas = document.getElementById('pinballCanvas');
const ctx = canvas.getContext('2d');
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const rankList = document.getElementById('rankList');
const orderToggle = document.getElementById('orderToggle');
const boardTitle = document.getElementById('boardTitle');

// 게임 내부 데이터 상태
let balls = [];
let pegs = [];
let rankings = []; // 공이 도달한 실제 '순서대로' 이름이 저장됨
let isPlaying = false;
let isFirstOrder = true; // true: 먼저 도착 순, false: 늦게 도착 순

// 눈에 띄는 화려한 공 색상 목록
const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF0', '#FFA500', '#9A33FF', '#00FF87', '#FF007F'];

// 3가지 테마 디자인 설정 데이터
const themes = {
    midnight: { bg: '#162447', peg: '#4ecca3', line: '#e94560', ballStroke: '#ffffff' },
    neon: { bg: '#050505', peg: '#ff00ff', line: '#00ffff', ballStroke: '#ffffff' },
    forest: { bg: '#1b4332', peg: '#d8f3dc', line: '#ffb703', ballStroke: '#ffffff' }
};
let currentTheme = themes.midnight;

// 1. 장애물(Peg) 배치 생성 (지그재그 격자 구조)
function initPegs() {
    pegs = [];
    const rows = 8;
    const cols = 8;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let x = 50 + c * 55 + (r % 2 === 0 ? 0 : 25);
            let y = 120 + r * 50;
            if (x < canvas.width - 20) {
                pegs.push({ x: x, y: y, radius: 6 });
            }
        }
    }
}

// 2. 공(Ball) 클래스 정의
class Ball {
    constructor(name, x, color) {
        this.name = name;
        this.x = x;
        this.y = 30; // 상단 출발선 높이
        this.radius = 14;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 3; // 초기 좌우 무작위 속도
        this.vy = 1;                         // 초기 낙하 속도
        this.gravity = 0.15;                 // 중력 가속도
        this.bounce = 0.5;                   // 반사 탄성 계수
        this.isFinished = false;
    }

    update() {
        if (this.isFinished) return;

        // 물리 법칙: 가속도 적용 및 위치 이동
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // 좌우 벽면 충돌 처리
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -this.bounce;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -this.bounce;
        }

        // 장애물(Peg)과의 충돌 처리 (수학 공식 활용)
        pegs.forEach(peg => {
            let dx = this.x - peg.x;
            let dy = this.y - peg.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius + peg.radius) {
                let angle = Math.atan2(dy, dx);
                // 밀려남 처리
                this.x = peg.x + Math.cos(angle) * (this.radius + peg.radius);
                this.y = peg.y + Math.sin(angle) * (this.radius + peg.radius);
                
                // 튕겨나가는 속도 계산 및 무작위성 부여
                let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx = Math.cos(angle) * speed * this.bounce + (Math.random() - 0.5) * 1;
                this.vy = Math.sin(angle) * speed * this.bounce;
            }
        });

        // [기능 추가 1] 공과 공끼리의 충돌 처리 (이중 반복 연산 기반)
        balls.forEach(other => {
            if (other === this || other.isFinished) return;
            
            let dx = this.x - other.x;
            let dy = this.y - other.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius * 2) {
                let angle = Math.atan2(dy, dx);
                // 겹침 현상 방지를 위해 살짝 밀어내기
                this.x = other.x + Math.cos(angle) * (this.radius * 2);
                
                // 서로 반대 방향으로 속도 튕기기 가중치 부여
                this.vx += Math.cos(angle) * 1.2;
                this.vy += Math.sin(angle) * 1.2;
                other.vx -= Math.cos(angle) * 1.2;
                other.vy -= Math.sin(angle) * 1.2;
            }
        });

        // 바닥 빨간 선 도달 판정
        if (this.y + this.radius >= canvas.height - 5) {
            this.y = canvas.height - 5 - this.radius;
            this.isFinished = true;
            recordRank(this.name);
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = currentTheme.ballStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.closePath();

        // 공 중심에 텍스트 렌더링
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name.substring(0, 3), this.x, this.y + 4);
    }
}

// 3. [기능 추가 3] 정렬 기준에 따른 순위판 화면 출력 함수
function renderLeaderboard() {
    rankList.innerHTML = '';
    
    // 원본 데이터 보존을 위해 배열 복사
    let displayRank = [...rankings];
    
    // '늦게 도착 순' 선택 시 화면 표시 배열만 뒤집기
    if (!isFirstOrder) {
        displayRank.reverse();
    }

    displayRank.forEach((name, index) => {
        const li = document.createElement('li');
        // 순위 숫자 매기기 계산 분기
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

// 4. 애니메이션 메인 루프 프레임 제어
function animate() {
    if (!isPlaying) return;
    
    // 잔상 렌더링 효과 적용
    ctx.fillStyle = currentTheme.bg;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0; // 복구

    // 테마 기반 장애물 렌더링
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = currentTheme.peg;
        ctx.fill();
        ctx.closePath();
    });

    // 테마 기반 도착선 렌더링
    ctx.strokeStyle = currentTheme.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 5);
    ctx.lineTo(canvas.width, canvas.height - 5);
    ctx.stroke();

    // 모든 객체 업데이트 및 드로잉
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    requestAnimationFrame(animate);
}

// 5. 제어 이벤트 처리 리스너들

// [기능 추가 2] 라디오 버튼 변경 이벤트 바인딩
document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentTheme = themes[e.target.value];
        if (!isPlaying) {
            // 게임 중이 아닐 때는 배경 디자인을 바로 리프레시해 줌
            ctx.fillStyle = currentTheme.bg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            pegs.forEach(peg => {
                ctx.beginPath();
                ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
                ctx.fillStyle = currentTheme.peg;
                ctx.fill();
                ctx.closePath();
            });
        }
    });
});

// [기능 추가 3] 정렬 방식 변경 토글 스위치 처리
orderToggle.addEventListener('click', () => {
    isFirstOrder = !isFirstOrder;
    if (isFirstOrder) {
        orderToggle.textContent = "먼저 도착 순";
        boardTitle.textContent = "🏆 실시간 순위 (먼저 도착 순)";
    } else {
        orderToggle.textContent = "늦게 도착 순";
        boardTitle.textContent = "🏆 실시간 순위 (늦게 도착 순)";
    }
    renderLeaderboard(); // 기존 결과 새로 정렬해서 뿌리기
});

// 게임 시작 액션
startBtn.addEventListener('click', () => {
    if (isPlaying) return;

    const names = nameInput.value.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) {
        alert('공을 생성할 이름을 최소 1개 이상 작성해 주세요!');
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

// 화면 및 데이터 클리어 액션
resetBtn.addEventListener('click', () => {
    isPlaying = false;
    balls = [];
    rankings = [];
    rankList.innerHTML = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    initPegs();
    
    // 초기 테마 스타일로 배경 그리기
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = currentTheme.peg;
        ctx.fill();
        ctx.closePath();
    });
});

// 앱 첫 구동 시 초기화 실행
initPegs();
resetBtn.click();

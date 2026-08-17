async function test() {
  const res = await fetch('http://localhost:5000/api/requests');
  const data = await res.json();
  console.log("Number of requests:", data.requests.length);
  console.log(data.requests.map(r => ({ gamertag: r.gamertag, age: r.userAge, isAdult: r.userAge >= 18 })));
}

test();

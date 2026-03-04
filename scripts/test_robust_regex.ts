const raceDataText1 = "発走 16:20 締切 16:15 9車";
const raceDataText2 = "発走予定 16:20 締切 16:15 9車";
const raceDataText3 = "16:20 16:15";

function extractTimes(text: string) {
    const timeMatches = text.match(/(\d{1,2}:\d{2})/g);
    const departure_time = timeMatches && timeMatches[0] ? `${timeMatches[0]}:00`.slice(0, 8) : '00:00:00';
    const deadline_time = timeMatches && timeMatches[1] ? `${timeMatches[1]}:00`.slice(0, 8) : departure_time;
    return { departure_time, deadline_time };
}

console.log(extractTimes(raceDataText1));
console.log(extractTimes(raceDataText2));
console.log(extractTimes(raceDataText3));

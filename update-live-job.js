const process = require("process");
const chalk = require("chalk");
const { readdirSync, statSync, renameSync } = require('fs')
const { join } = require('path')

const buildDirectoryPattern = /^build-(\d+)(-live)?$/;

const parentDir = process.argv[2];

if (!parentDir) {
    throw "An argument indicating the parent name must be provided as the first argument.";
}

console.log(`Updating the live job definition in ${parentDir}...`);

const changes = readdirSync(parentDir)
    .filter(whereIsFsEntryDirectory(parentDir))
    .map(d => {
        const parsed = buildDirectoryPattern.exec(d);

        if (!parsed) {
            return null;
        }

        return {
            dir: join(parentDir, d),
            ageDays: getAgeDays(statSync(parentDir).birthTime),
            number: parseInt(parsed[1]),
            isLive: isLiveDirectory(d)
        };
    })
    .filter(d => !!d)
    .sort((a, b) => a.number - b.number)
    .map((d, i, all) => {
        if (!d.isLive && isLast(i, all)) {
            return commission(d);
        }

        if (d.isLive && !isLast(i, all)) {
            return decommission(d);
        }

        return null;
    })
    .filter(d => !!d);

if (!changes.length) {
    console.log(chalk.yellow("...No changes required."));

    return;
}

changes.forEach(c => {
    if (c.isLive) {
        return console.log(chalk.green(`...Build ${c.number} is now live!`));
    }

    console.log(chalk.red(`...Build ${c.number} is no longer live.`));
});

function decommission(d) {
    renameSync(d.dir, nonLiveFolderNameFor(d.number));

    return Object.assign({}, d, {
        isLive: false
    });
}

function commission(d) {
    renameSync(d.dir, liveFolderNameFor(d.number));

    return Object.assign({}, d, {
        isLive: true
    });
}

function isOld(d) {
    return d.ageDays > maxAgeDays;
}

function getAgeDays(date) {
    const ageMs = new Date() - date;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    return ageDays;
}

function whereIsFsEntryDirectory(d) {
    return f => statSync(join(d, f)).isDirectory();
}

function isLiveDirectory(d) {
    return !!d.match(/\d-live/);
}

function isLast(i, all) {
    return all.length === i + 1;
}

function nonLiveFolderNameFor(buildNumber) {
    return join(parentDir, `build-${buildNumber}`);
}

function liveFolderNameFor(buildNumber) {
    return join(parentDir, `build-${buildNumber}-live`);
}
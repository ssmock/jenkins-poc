const chalk = require("chalk");
const { readdirSync, statSync, renameSync } = require('fs')
const { join } = require('path')

const buildDirectoryPattern = /^build-(\d+)(-live)?$/;

const cwd = "./";

const changes = readdirSync(cwd)
    .filter(whereIsFsEntryDirectory(cwd))
    .map(d => {
        const parsed = buildDirectoryPattern.exec(d);

        if (!parsed) {
            return null;
        }

        return {
            dir: join(cwd, d),
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
    console.log(chalk.yellow("No changes."));

    return;
}

changes.forEach(c => {
    if(c.isLive){
        return console.log(chalk.green(`Build ${c.number} is now live!`));
    }

    console.log(chalk.red(`Build ${c.number} is no longer live.`));
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
    return join(cwd, `build-${buildNumber}`);
}

function liveFolderNameFor(buildNumber) {
    return join(cwd, `build-${buildNumber}-live`);
}
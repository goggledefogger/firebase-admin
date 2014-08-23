
'use strict';

var optometrist = require('optometrist');
var FirebaseAccount = require('../account');

var schema = {
  firebaseUser: {
    description: 'Your Firebase API username.',
    required: true
  },
  firebasePass: {
    description: 'Your Firebase API password.',
    required: true
  }
};

var commandTree = {
  create: {
    _description: 'Create a new Firebase database.',
    _syntax: '[databaseName]',
    _action: function(name) {
      if (!name) {
        printAndExit('Missing argument databaseName');
      }

      return account.createDatabase(name)
      .then(function(db) {
        console.log('Done! New URL is', db.toString());
      });

    }
  },
  help: {
    _syntax: '[command]',
    _description: 'Provide help for the given command.',
    _action: function() {

      if (!arguments[0]) {
        printAndExit();
      }

      var command = '';
      var commandObject = commandTree;
      Array.prototype.slice.call(arguments, 0).every(function(part) {

        if (commandObject[part]) {
          command += part + ' ';
          commandObject = commandObject[part];
          return true;
        } else {
          return false;
        }

      });

      if (commandObject._description) {
        console.log(
          '\n',
          '  firebase-admin ' + command + ' ' + (commandObject._syntax || ''),
          '\n',
          '  ' + commandObject._description
        );
      } else {
        console.log('unknown command');
        process.exit(1);
      }
    }
  },
  delete: {
    _description: 'Delete a Firebase database.',
    _syntax: '[databaseName]',
    _action: function(name) {
      if (!name) {
        printAndExit('Missing argument databaseName');
      }

      console.log('Deleting Firebase', name, 'because you told me to.');
      return account.getDatabase(name)
      .then(function(db) {
        return account.deleteDatabase(db)
        .then(function() {
          console.log('Successfully deleted', name + '.');
        });
      });

    }
  },
  tokens: {
    _description: 'Actions on Firebase auth tokens',
    add: {
      _description: 'Create a new auth token for the selected Firebase.',
      _syntax: '[databaseName]',
      _action: function(name) {
        if (!name) {
          printAndExit('Missing argument databaseName');
        }

        return account.getDatabase(name)
        .then(function(db) {
          return db.addAuthToken()
          .then(function(token) {
            console.log(token);
          });
        });

      }
    },
    remove: {
      _description: 'Remove an auth token from the selected Firebase.',
      _syntax: '[databaseName] [token]',
      _action: function(name, token) {
        if (!name) {
          printAndExit('Missing argument databaseName');
        } else if (!token) {
          printAndExit('Missing argument token');
        }

        return account.getDatabase(name)
        .then(function(db) {
          return db.removeAuthToken(token.trim())
          .then(function() {
            console.log('Done!');
          });
        });

      }
    },

    list: {
      _description: 'List all auth tokens on the selected Firebase',
      _syntax: '[databaseName]',
      _action: function(name) {
        if (!name) {
          printAndExit('Missing argument databaseName');
        }

        return account.getDatabase(name)
        .then(function(db) {
          return db.getAuthTokens()
          .then(function(tokens) {
            tokens.forEach(function(token) { console.log(token); });
          });
        });
      }
    }
  },
};


var opts;
try {
  opts = optometrist.get(schema);
} catch(e) {
  printAndExit(e);
}

var account = new FirebaseAccount(opts.firebaseUser, opts.firebasePass);

account.ready
.then(function() {

  var commandParts = [];
  process.argv.slice(2).forEach(function(arg) {

    if (arg.charAt(0) !== '-') {
      commandParts.push(arg);
    }

  });

  if (commandParts.length === 0) {
    printAndExit();
  }

  return (function parseCommand(tree, commands) {

    if (tree[commands[0]]) {
      return parseCommand(tree[commands[0]], commands.slice(1));
    } else if (tree._action) {
      return tree._action.apply(null, commands);
    } else {
      printAndExit('Bad command "' + commandParts.join(' ')  + '"');
    }

  })(commandTree, commandParts);

})
.catch(function(e) {
  printAndExit(e.message);
});

function printAndExit() {

  console.log(optometrist.usage('firebase-admin', 'CLI tool for Firebase administration', schema));
  console.log('Commands:\n');

  (function printTree(tree, level) {

    Object.keys(tree).forEach(function(commandName) {

      var subTree = tree[commandName];
      if (commandName.charAt(0) !== '_') {

        for (var i = 0; i < level; i++) {
          process.stdout.write('\t');
        }

        console.log(commandName, subTree._syntax || '', ':', subTree._description || '');

        printTree(subTree, level + 1);
      }

    });

  })(commandTree, 1);

  console.log();

  Array.prototype.slice.call(arguments, 0).forEach(function(arg) {
    console.log(arg);
  });

  process.exit(1);

}



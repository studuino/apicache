var _           = require('lodash');
var inflection  = require('inflection');

function Treeize(options) {
  var globalOptions = {
    delimiter: ':'
  };

  this.getOptions = function(options) {
    return _.clone(globalOptions);
  };

  this.setOptions = function(options) {
    _.extend(globalOptions, options);

    return this;
  };

  this.grow = function(flatData, config) {
    var localOptions  = _.extend(this.getOptions(), config || {});
    var translated    = [];

    if (!flatData || !flatData.length) { return flatData; }

    _.each(flatData, function(row, index) {
      var paths           = [];
      var trails          = {};

      // set up paths for processing
      _.each(row, function(value, attributePath) {
        var splitPath = attributePath.split(localOptions.delimiter);

        paths.push({
          splitPath:  _.initial(splitPath, 1),
          fullPath:   _.initial(splitPath, 1).join(localOptions.delimiter),
          parentPath: _.initial(splitPath, 2).join(localOptions.delimiter),
          node:       splitPath[splitPath.length - 2],
          attribute:  _.last(splitPath),
          value:      value,
          processed:  false
        });
      });

      // sort paths to prepare for processing
      paths.sort(function(a, b) {
        return a.splitPath.length < b.splitPath.length ? -1 : 1;
      });

      // proccess each unprocessed path in the row
      var trail = translated;

      while (_.findWhere(paths, { processed: false })) {
        var target = _.findWhere(paths, { processed: false });

        // get associated group
        var group = _.where(paths, { parentPath: target.parentPath, node: target.node, processed: false });

        // build blueprint for current group
        var blueprint = {};
        _.each(group, function(groupItem) {
          blueprint[groupItem.attribute] = groupItem.value;
          groupItem.processed = true;
        });

        // set up first node, everythign else should have parent path
        if (!(trail = trails[target.parentPath])) {
          if (!(trail = _.findWhere(translated, blueprint))) {
            translated.push(trail = blueprint);
          }
          trails[target.parentPath] = trail;
        }

        // trail is now at parent node, standing by for current node injection
        if (target.node) { // should skip root
          var isCollection = target.node === inflection.pluralize(target.node);
          var node = trail[target.node] = (trail[target.node] || (isCollection ? [blueprint] : blueprint));

          if (isCollection && !(node = _.findWhere(trail[target.node], blueprint))) {
            node = blueprint;
            trail[target.node].push(node);
          }

          trails[target.fullPath] = node;
        }
      }
    });

    return translated;
  }
}

var treeize = module.exports = new Treeize();
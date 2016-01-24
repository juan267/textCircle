this.Documents = new Mongo.Collection('documents')
EditingUsers = new Mongo.Collection('editUsers')

if (Meteor.isClient) {

  // Every 1 second update de session value of current_date
  // set interval call repetaly the function
  // Meteor.setInterval(function(){
  //   Session.set("current_date", new Date)
  // }, 1000)

  Template.editor.helpers({
    docid: function(){
      var doc = Documents.findOne()
      if (doc) {
        return doc._id
      } else {
        return undefined
      }
    },
    config:function(){
      return function(editor){
        editor.setOption("lineNumbers", true)
        editor.setOption("theme", "monokai")
        editor.on("change", function(cm_editor, info){
          $('#viewer-iframe').contents().find("html").html(cm_editor.getValue())
            Meteor.call('addEditinguser')
        })
      }
    }
  })

  Template.editingUsers.helpers({
    users: function(){
      var doc = Documents.findOne()
      if (!doc) {return};
      var eusers = EditingUsers.findOne({docid: doc._id})
      if (!eusers) {return};
      var users = []
      var i = 0
      for (var user_id in eusers.users){
        users[i] = fixObjectKeys(eusers.users[user_id])
        i++
      }
      return users
    }
  })
} // is client end

if (Meteor.isServer) {
  Meteor.startup(function () {

    if (!Documents.findOne()) {
      Documents.insert({title:'My new Document'});
    }
  });
}

Meteor.methods({
  addEditinguser: function() {
    var doc = Documents.findOne()
    if (!doc) {return;} // Give up
    if (!this.userId) {return;} // Give up
    var user = Meteor.user().profile
    var eusers = EditingUsers.findOne({docid: doc._id})
    if (!eusers) {
      eusers = {
        docid: doc._id,
        users: {}
      }
    }
    user.lasEdit = new Date();
    eusers.users[this.userId] = user;
    EditingUsers.upsert({_id:eusers._id}, eusers)
  }
})


function fixObjectKeys(obj) {
  var newObj = {};
  for(key in obj){
    var key2 = key.replace("-", "")
    newObj[key2] = obj[key]
  }
  return newObj
};

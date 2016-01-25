this.Documents = new Mongo.Collection('documents')
EditingUsers = new Mongo.Collection('editUsers')

if (Meteor.isClient) {

  Meteor.subscribe('editUsers');
  Meteor.subscribe('documents');
  Meteor.subscribe('users');

  // Every 1 second update de session value of current_date
  // set interval call repetaly the function
  // Meteor.setInterval(function(){
  //   Session.set("current_date", new Date)
  // }, 1000)

  Template.editor.helpers({
    docid: function(){
      setCurrentDoc();
      return Session.get('docid')
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

  Template.navbar.helpers({
    documents: function() {
      return Documents.find({})
    }
  })

  Template.docMeta.helpers({
    document: function() {
      return Documents.findOne({_id: Session.get('docid')})
    },
    owner: function() {
      var user = Meteor.users.findOne({_id: this.owner})
      if (user) {
        return user.profile["first-name"]
      } else {
        return "Anonymous"
      }
    },
    ownDocument: function() {
      var doc = Documents.findOne({_id: Session.get('docid'), owner: Meteor.userId()})
      if (doc) {
        return true
      }else{
        return false
      }
    }
  })

  Template.editableText.helpers({
    userCanEdit: function(doc, Collection) {
      var doc = Documents.findOne({_id: Session.get("docid"), owner: Meteor.userId()})
      if (doc) {
        return true
      } else {
        return false
      }
    }
  })

  /////////
  // EVENTS
  /////////

  Template.navbar.events({
    "click .js-add-doc": function(event) {
      event.preventDefault()
      console.log("Added new Documetn")
      var user = Meteor.user()
      if (!user) {
        alert("You need to be logged in")
      } else {
        Meteor.call("addDoc", function(error, response) { // Asyncronos programing Methods run asycncronosly
          if (!error) {
            Session.set('docid', response)
          }
        })
      }
    },
    "click .js-load-doc": function(event) {
      Session.set('docid', this._id)
    }
  })

  Template.docMeta.events({
      "click .js-tog-private": function(event) {
      var doc = {
        _id: Session.get('docid'),
        isPrivate: event.target.checked
      }
      Meteor.call("updateDocIsPrivate", doc)
    }
  })
} // is client end

if (Meteor.isServer) {
  Meteor.startup(function () {

    if (!Documents.findOne()) {
      Documents.insert({title:'My new Document'});
    }
  })

  Meteor.publish('documents', function(){
    return Documents.find({
      $or: [
        {isPrivate: false},
        {owner: this.userId}
      ]
    })
  })

  Meteor.publish("editUsers", function(){
    return EditingUsers.find({})
  })

  Meteor.publish("users", function() {
    return Meteor.users.find({})
  })
}

Meteor.methods({
  addDoc: function() {
    var user_id = this.userId
    if (!user_id) {
      return
    } else {
      var doc = {
        owner: user_id,
        title: "New document",
        createdOn: new Date(),
        isPrivate: false
      }
      var id = Documents.insert(doc)
      return id
    }
  },
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
  },
  updateDocIsPrivate: function(doc) {
    var realDoc = Documents.findOne({_id: doc._id, owner: this.userId})
    if (realDoc) {
      realDoc.isPrivate = doc.isPrivate
      Documents.update({_id: doc._id}, realDoc)
    }
  }
})


function setCurrentDoc() {
  if (!Session.get("docid")) {
    var doc = Documents.findOne()
    if (doc) {
      Session.set('docid', doc._id)
    }
  }
};

function fixObjectKeys(obj) {
  var newObj = {};
  for(key in obj){
    var key2 = key.replace("-", "")
    newObj[key2] = obj[key]
  }
  return newObj
};

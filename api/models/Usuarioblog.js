/**
 * Usuarioblog.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = (function(){
  var
    bcrypt = bcrypt || require('bcrypt'),
    mailjet = mailjet || require('node-mailjet').connect(
      sails.config.mailjet.apiKey,
      sails.config.mailjet.secretKey
    );
  return {
    attributes: {
      usuario:{
        model: 'usuario'
      },
      username:{
        type: 'string',
        required: true
      },
      nombre:{
        type: 'string',
        required: true
      },
      slugnombre:{
        type: 'string',
        required: true
      },
      estado: {
        type: 'string',
        enum:[
          'activo',
          'inactivo',
          'borrado',
        ],
        defaultsTo: 'activo',
      },
      creador:{
        model: 'usuarioblog',
        required: true
      },
      email: {
        type: 'string',
        unique: true,
        required: true
      },
      password:{
        type: 'string',
        required: true
      },
      confirmation:{
        type: 'string',
        required: true
      },
      apellido:{
        type: 'string',
        required: true
      },
      slugapellido:{
        type: 'string',
        required: true
      },
      doctipo:{
        type: 'string',
        enum:[
          'cc',
          'exc'
        ],
        defaultsTo: 'cc'
      },
      documento:{
        type: 'string',
        required: true
      },
      departamentonacimiento:{
        model: 'departamento'
      },
      fechadenacimiento:{
        type: 'date'
      },
      ciudadnacimiento:{
        model: 'ciudades'
      },
      estadocivil:{
        type: 'string',
        enum:[
          'soltero',
          'casado',
          'viudo',
          'divorciado'
        ],
        defaultsTo: 'soltero'
      },
      barrio:{
        model: 'barrio'
      },
      ciudad:{
        model: 'ciudades'
      },
      pais:{
        model: 'pais'
      },
      telefono:{
        type: 'float'
      },
      celular:{
        type: 'float'
      },
      extra:{
        collection: 'Comentario'
      },
      contrato:{
        collection: 'contrato'
      },
      blog:{
        model: 'blog',
        required: true
      },
      blogapi:{
        model: 'blog',
        required: true
      },
      categoriausuario:{
        collection: 'categoriausuario',
        via: 'usuarioblog'
      },
      direccion:{
        type: 'string'
      },
      rol:{
        model: 'rol',
        required: true
      },
      namerol:{
        type: 'string'
      },
      roles:{
        collection: 'usuariorol',
        via: 'usuarioblog'
      },
      toJSON: function() {
        if (this && _.isFunction(this.toObject)) {
          var obj = this.toObject();

          delete obj.salt;
          // delete obj.password;
          // obj.comentarios = _.sortBy(
          //   _.union(obj.comentarioshechos, obj.comentariosrecibidos), ['updatedAt']
          // );

          return obj;
        }
        return this;
      },
      // afterCreate: function(req, res){
      //   var
      //     params = req.allParams()
      //   ;
      //   function validPassword() {
      //     return new Promise(function(resolve, reject) {
      //       bcrypt.compare(password, usuario.password, function(err, valid) {
      //         if (err) cb(err);
      //
      //         if (valid) {
      //           if (_.isFunction(cb)) {
      //             return cb(null, true);
      //           }
      //           return resolve(true);
      //         }
      //         if (_.isFunction(cb)) {
      //           cb(err);
      //         }
      //         reject(err)
      //       });
      //     });
      //   }
      // },
      validPassword: function(password, usuario, cb) {
        return new Promise(function(resolve, reject) {
          bcrypt.compare(password, usuario.password, function(err, valid) {
            if (err) cb(err);

            if (valid) {
              if (_.isFunction(cb)) {
                return cb(null, true);
              }
              return resolve(true);
            }
            if (_.isFunction(cb)) {
              cb(err);
            }
            reject(err)
          });
        });
      },
      // Crea/Modifica el password del usuario
      createPassword: function(password, usuario, cb) {
        return new Promise(function(resolve, reject) {
          bcrypt.genSalt(10, function(err, salt) {
            if (err) {
              if (_.isFunction(cb)) {
                return cb(err);
              }
              return reject(err);
            }
            usuario.salt = salt;
            bcrypt.hash(password, salt, function(err, encryptedPassword) {
              if (err) {
                reject(err);
                if (_.isFunction(cb)) {
                  return cb(err);
                }
              }
              usuario.password = encryptedPassword;
              resolve(usuario)
              if (_.isFunction(cb)) {
                cb();
              }
            });
          });
        });
      },

      beforeValidate: function(values, cb) {
        if (values.username) {
          if (!values.slug) {
            values.slug = Tools.getSlug(values.username);
          }
          if (!values.nombre) {
            values.nombre = values.username;
          }
        }
        if (values.nombre && !values.slugnombre) {
          values.slugnombre = Tools.getSlug(values.nombre);
        }
        if (values.email) {
          values.email = values.email.toLowerCase();
        }
        cb();
      },
      beforeCreate: function(values, next) {

        if (!values.password || (values.password && values.password != values.confirmation)) {
          return next({
            err: ["Password doesnt match password confirmation"]
          });
        }
        this.createPassword(values.password, values, next);
      },
      beforeUpdate: function(values, next) {
        if (values.password && values.newPassword && values.confirmation) {
          if (values.password !== values.newPassword && values.newPassword === values.confirmation) {
            var
              createPass = this.createPassword,
              validPass = this.validPassword;
            return UsuarioBlog
              .findOne(values.id)
              .then(function(usr) {
                if (usr && usr.id) {
                  return validPass(values.password, usr);
                }
                return Promise.reject('not found user');
              })
              .then(function(valid) {
                // If the password from the form doesn't match the password from the database...
                if (!valid) {
                  // console.log('incorrect password')
                  // No modifica password
                  return Promise.reject('not valid user');
                }
                // console.log('about to enter bcrypt.hash')
                return createPass(values.newPassword, values);
              })
              .then(function(val) {
                next(null, val);
              }, next);
          } else {
            return next({
              err: ["Password doesnt match password confirmation"]
            });
          }
        } else {
          delete values.password;
          delete values.newPassword;
          delete values.confirmation;
        }
        next();
      },
      beforeDestroy: function(criteria, next) {
        UsuarioBlog
          .update(criteria, {
            activo: false
          })
          .then(function(usr) {
            // Nunca podrá eliminar un Usuario, sólo se modifica "activo"
            next(false);
          });
      },
      afterDestroy: function(criteria, next) {
        UsuarioBlog
          .update(criteria, {
            activo: false
          })
          .then(function(usr) {
            // Nunca podrá eliminar un Usuario, sólo se modifica "activo"
            next(false);
          });
      }
    }
  }
})();
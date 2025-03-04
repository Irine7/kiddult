class User {
  static async findByUsername(username) {
    // Здесь должна быть логика поиска пользователя в базе данных
    // Для демонстрации используем фиктивные данные
    return { username: 'admin', password: 'admin', deviceId: '12345' };
  }
}

module.exports = User;

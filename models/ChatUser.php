<?php

namespace humhub\modules\messenger\models;

use humhub\components\ActiveRecord;
use humhub\modules\user\models\User;
use humhub\modules\user\models\Space;

/**
 *
 */
class ChatUser extends ActiveRecord
{
    /**
     * @return string the associated database table name
     */
    public static function tableName()
    {
        return 'chat_user';
    }
}

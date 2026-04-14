package de.thd.roomfinder.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import de.thd.roomfinder.domain.presentation.RoomPresentationFormatter
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
internal object PresentationModule {

    @Provides
    @Singleton
    fun provideRoomPresentationFormatter(
        @ApplicationContext context: Context,
    ): RoomPresentationFormatter = RoomPresentationFormatter.fromAsset(context)
}
